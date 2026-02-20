import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationStep } from "@/components/dashboard/setup/steps/notification-step";
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

// Mock NotificationFormContent
vi.mock("@/components/adapter/form-sections", () => ({
    NotificationFormContent: () => <div data-testid="notification-form-content">Form fields</div>,
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
    { id: "discord", name: "Discord", type: "notification", configSchema: z.object({ webhookUrl: z.string() }) },
    { id: "email", name: "Email (SMTP)", type: "notification", configSchema: z.object({ host: z.string() }) },
];

const defaultWizardData: WizardData = {
    sourceId: "src-1",
    sourceName: "Test MySQL",
    destinationId: "dst-1",
    destinationName: "Test S3",
    encryptionProfileId: null,
    encryptionProfileName: null,
    notificationIds: [],
    notificationNames: [],
    jobId: null,
    jobName: null,
};

describe("NotificationStep", () => {
    const user = userEvent.setup();
    let onUpdate: Mock<(data: Partial<WizardData>) => void>;
    let onNext: Mock<() => void>;
    let onPrev: Mock<() => void>;
    let onSkip: Mock<() => void>;

    beforeEach(() => {
        onUpdate = vi.fn<(data: Partial<WizardData>) => void>();
        onNext = vi.fn<() => void>();
        onPrev = vi.fn<() => void>();
        onSkip = vi.fn<() => void>();
        mockFetch.mockReset();
    });

    function renderNotificationStep(dataOverrides: Partial<WizardData> = {}) {
        return render(
            <NotificationStep
                adapters={mockAdapters}
                wizardData={{ ...defaultWizardData, ...dataOverrides }}
                onUpdate={onUpdate}
                onNext={onNext}
                onPrev={onPrev}
                onSkip={onSkip}
            />
        );
    }

    it("should render the adapter picker initially", () => {
        renderNotificationStep();

        expect(screen.getByTestId("adapter-picker")).toBeInTheDocument();
        expect(screen.getByText("Discord")).toBeInTheDocument();
        expect(screen.getByText("Email (SMTP)")).toBeInTheDocument();
    });

    it("should show the step title", () => {
        renderNotificationStep();

        expect(screen.getByText("Set Up Notifications")).toBeInTheDocument();
    });

    it("should show Skip and Back buttons", () => {
        renderNotificationStep();

        expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should call onSkip when Skip is clicked", async () => {
        renderNotificationStep();

        await user.click(screen.getByRole("button", { name: /skip/i }));

        expect(onSkip).toHaveBeenCalledOnce();
    });

    it("should call onPrev when Back is clicked", async () => {
        renderNotificationStep();

        await user.click(screen.getByRole("button", { name: /back/i }));

        expect(onPrev).toHaveBeenCalledOnce();
    });

    it("should show the form after selecting an adapter", async () => {
        renderNotificationStep();

        await user.click(screen.getByTestId("adapter-discord"));

        await waitFor(() => {
            expect(screen.getByLabelText("Name")).toBeInTheDocument();
        });
    });

    it("should show saved state when wizardData already has notifications", () => {
        renderNotificationStep({
            notificationIds: ["notif-1"],
            notificationNames: ["Discord Alerts"],
        });

        expect(screen.getByText("Notification Channel Created")).toBeInTheDocument();
        expect(screen.getByText("Discord Alerts")).toBeInTheDocument();
    });

    it("should call onNext from saved state Continue button", async () => {
        renderNotificationStep({
            notificationIds: ["notif-1"],
            notificationNames: ["Discord Alerts"],
        });

        await user.click(screen.getByRole("button", { name: /continue/i }));

        expect(onNext).toHaveBeenCalledOnce();
    });
});
