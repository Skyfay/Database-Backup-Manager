import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceStep } from "@/components/dashboard/setup/steps/source-step";
import type { WizardData } from "@/components/dashboard/setup/setup-wizard";
import type { AdapterDefinition } from "@/lib/adapters/definitions";
import { z } from "zod";

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
    const Icon = ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children as React.ReactNode}</span>;
    return new Proxy({ __esModule: true, then: undefined } as Record<string, unknown>, {
        get: (target, prop) => {
            if (prop === "then") return undefined;
            if (prop === "__esModule") return true;
            return Icon;
        },
        has: () => true,
    });
});

// Mock AdapterPicker
const mockOnSelect = vi.fn();
vi.mock("@/components/adapter/adapter-picker", () => ({
    AdapterPicker: ({ adapters, onSelect }: { adapters: AdapterDefinition[]; onSelect: (a: AdapterDefinition) => void }) => (
        <div data-testid="adapter-picker">
            {adapters.map((a) => (
                <button key={a.id} onClick={() => { mockOnSelect(a); onSelect(a); }} data-testid={`adapter-${a.id}`}>
                    {a.name}
                </button>
            ))}
        </div>
    ),
}));

// Mock DatabaseFormContent (complex child component)
vi.mock("@/components/adapter/form-sections", () => ({
    DatabaseFormContent: () => <div data-testid="database-form-content">Form fields</div>,
}));

// Mock SchemaField
vi.mock("@/components/adapter/schema-field", () => ({
    SchemaField: () => <div data-testid="schema-field">Schema field</div>,
}));

// Mock useAdapterConnection hook
const mockTestConnection = vi.fn();
vi.mock("@/components/adapter/use-adapter-connection", () => ({
    useAdapterConnection: () => ({
        detectedVersion: null,
        availableDatabases: [],
        isLoadingDbs: false,
        isDbListOpen: false,
        setIsDbListOpen: vi.fn(),
        testConnection: mockTestConnection,
        fetchDatabases: vi.fn(),
    }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAdapters: AdapterDefinition[] = [
    { id: "mysql", name: "MySQL", type: "database", configSchema: z.object({ host: z.string().default("localhost") }) },
    { id: "postgres", name: "PostgreSQL", type: "database", configSchema: z.object({ host: z.string().default("localhost") }) },
];

const defaultWizardData: WizardData = {
    sourceId: null,
    sourceName: null,
    destinationId: null,
    destinationName: null,
    encryptionProfileId: null,
    encryptionProfileName: null,
    notificationIds: [],
    notificationNames: [],
    jobId: null,
    jobName: null,
};

describe("SourceStep", () => {
    const user = userEvent.setup();
    let onUpdate: ReturnType<typeof vi.fn>;
    let onNext: ReturnType<typeof vi.fn>;
    let onPrev: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onUpdate = vi.fn();
        onNext = vi.fn();
        onPrev = vi.fn();
        mockFetch.mockReset();
        mockTestConnection.mockReset();
    });

    function renderSourceStep(dataOverrides: Partial<WizardData> = {}) {
        return render(
            <SourceStep
                adapters={mockAdapters}
                wizardData={{ ...defaultWizardData, ...dataOverrides }}
                onUpdate={onUpdate}
                onNext={onNext}
                onPrev={onPrev}
            />
        );
    }

    it("should render the adapter picker initially", () => {
        renderSourceStep();

        expect(screen.getByTestId("adapter-picker")).toBeInTheDocument();
        expect(screen.getByText("MySQL")).toBeInTheDocument();
        expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    });

    it("should show the step title", () => {
        renderSourceStep();

        expect(screen.getByText("Choose your Database Type")).toBeInTheDocument();
    });

    it("should show the form after selecting an adapter", async () => {
        renderSourceStep();

        await user.click(screen.getByTestId("adapter-mysql"));

        // After selecting, the form should appear (with name input)
        await waitFor(() => {
            expect(screen.getByLabelText("Name")).toBeInTheDocument();
        });
    });

    it("should show the selected adapter type as badge after selection", async () => {
        renderSourceStep();

        await user.click(screen.getByTestId("adapter-mysql"));

        await waitFor(() => {
            expect(screen.getByText("MySQL")).toBeInTheDocument();
        });
    });

    it("should show Back button", () => {
        renderSourceStep();

        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should call onPrev when Back is clicked", async () => {
        renderSourceStep();

        await user.click(screen.getByRole("button", { name: /back/i }));

        expect(onPrev).toHaveBeenCalledOnce();
    });

    it("should show saved state when wizardData already has sourceId", () => {
        renderSourceStep({
            sourceId: "src-existing",
            sourceName: "Existing MySQL",
        });

        expect(screen.getByText("Database Source Created")).toBeInTheDocument();
        expect(screen.getByText("Existing MySQL")).toBeInTheDocument();
    });

    it("should call onNext from saved state Continue button", async () => {
        renderSourceStep({
            sourceId: "src-existing",
            sourceName: "Existing MySQL",
        });

        await user.click(screen.getByRole("button", { name: /continue/i }));

        expect(onNext).toHaveBeenCalledOnce();
    });
});
