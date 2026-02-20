import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DestinationStep } from "@/components/dashboard/setup/steps/destination-step";
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
vi.mock("@/components/adapter/adapter-picker", () => ({
    AdapterPicker: ({ adapters, onSelect }: { adapters: AdapterDefinition[]; onSelect: (a: AdapterDefinition) => void }) => (
        <div data-testid="adapter-picker">
            {adapters.map((a) => (
                <button key={a.id} onClick={() => onSelect(a)} data-testid={`adapter-${a.id}`}>
                    {a.name}
                </button>
            ))}
        </div>
    ),
}));

// Mock StorageFormContent
vi.mock("@/components/adapter/form-sections", () => ({
    StorageFormContent: () => <div data-testid="storage-form-content">Form fields</div>,
}));

// Mock useAdapterConnection hook
vi.mock("@/components/adapter/use-adapter-connection", () => ({
    useAdapterConnection: () => ({
        testConnection: vi.fn(),
    }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAdapters: AdapterDefinition[] = [
    { id: "local", name: "Local Filesystem", type: "storage", configSchema: z.object({ path: z.string().default("/backups") }) },
    { id: "s3", name: "Amazon S3", type: "storage", configSchema: z.object({ bucket: z.string() }), group: "Cloud Storage (S3)" },
];

const defaultWizardData: WizardData = {
    sourceId: "src-1",
    sourceName: "Test MySQL",
    destinationId: null,
    destinationName: null,
    encryptionProfileId: null,
    encryptionProfileName: null,
    notificationIds: [],
    notificationNames: [],
    jobId: null,
    jobName: null,
};

describe("DestinationStep", () => {
    const user = userEvent.setup();
    let onUpdate: Mock<(data: Partial<WizardData>) => void>;
    let onNext: Mock<() => void>;
    let onPrev: Mock<() => void>;

    beforeEach(() => {
        onUpdate = vi.fn<(data: Partial<WizardData>) => void>();
        onNext = vi.fn<() => void>();
        onPrev = vi.fn<() => void>();
        mockFetch.mockReset();
    });

    function renderDestinationStep(dataOverrides: Partial<WizardData> = {}) {
        return render(
            <DestinationStep
                adapters={mockAdapters}
                wizardData={{ ...defaultWizardData, ...dataOverrides }}
                onUpdate={onUpdate}
                onNext={onNext}
                onPrev={onPrev}
            />
        );
    }

    it("should render the adapter picker initially", () => {
        renderDestinationStep();

        expect(screen.getByTestId("adapter-picker")).toBeInTheDocument();
        expect(screen.getByText("Local Filesystem")).toBeInTheDocument();
        expect(screen.getByText("Amazon S3")).toBeInTheDocument();
    });

    it("should show the step title", () => {
        renderDestinationStep();

        expect(screen.getByText("Choose your Storage Type")).toBeInTheDocument();
    });

    it("should show the form after selecting an adapter", async () => {
        renderDestinationStep();

        await user.click(screen.getByTestId("adapter-local"));

        await waitFor(() => {
            expect(screen.getByLabelText("Name")).toBeInTheDocument();
        });
    });

    it("should show Back button", () => {
        renderDestinationStep();

        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should call onPrev when Back is clicked", async () => {
        renderDestinationStep();

        await user.click(screen.getByRole("button", { name: /back/i }));

        expect(onPrev).toHaveBeenCalledOnce();
    });

    it("should show saved state when wizardData already has destinationId", () => {
        renderDestinationStep({
            destinationId: "dst-existing",
            destinationName: "Existing S3",
        });

        expect(screen.getByText("Storage Destination Created")).toBeInTheDocument();
        expect(screen.getByText("Existing S3")).toBeInTheDocument();
    });

    it("should call onNext from saved state Continue button", async () => {
        renderDestinationStep({
            destinationId: "dst-existing",
            destinationName: "Existing S3",
        });

        await user.click(screen.getByRole("button", { name: /continue/i }));

        expect(onNext).toHaveBeenCalledOnce();
    });
});
