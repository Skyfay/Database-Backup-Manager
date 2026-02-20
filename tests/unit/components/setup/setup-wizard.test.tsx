import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupWizard } from "@/components/dashboard/setup/setup-wizard";

// Mock ADAPTER_DEFINITIONS (Zod schemas must not be imported in test env directly for simplicity)
vi.mock("@/lib/adapters/definitions", () => ({
    ADAPTER_DEFINITIONS: [
        { id: "mysql", name: "MySQL", type: "database", configSchema: {} },
        { id: "postgres", name: "PostgreSQL", type: "database", configSchema: {} },
        { id: "local", name: "Local Filesystem", type: "storage", configSchema: {} },
        { id: "s3", name: "Amazon S3", type: "storage", configSchema: {} },
        { id: "discord", name: "Discord", type: "notification", configSchema: {} },
    ],
}));

// Mock all step components to isolate wizard logic
vi.mock("@/components/dashboard/setup/steps/welcome-step", () => ({
    WelcomeStep: ({ onNext, steps }: { onNext: () => void; steps: unknown[] }) => (
        <div data-testid="welcome-step">
            <span data-testid="step-count">{steps.length}</span>
            <button onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/setup/steps/source-step", () => ({
    SourceStep: ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => (
        <div data-testid="source-step">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/setup/steps/destination-step", () => ({
    DestinationStep: ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => (
        <div data-testid="destination-step">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/setup/steps/vault-step", () => ({
    VaultStep: ({ onNext, onPrev, onSkip }: { onNext: () => void; onPrev: () => void; onSkip: () => void }) => (
        <div data-testid="vault-step">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onSkip}>Skip</button>
            <button onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/setup/steps/notification-step", () => ({
    NotificationStep: ({ onNext, onPrev, onSkip }: { onNext: () => void; onPrev: () => void; onSkip: () => void }) => (
        <div data-testid="notification-step">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onSkip}>Skip</button>
            <button onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/setup/steps/job-step", () => ({
    JobStep: ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => (
        <div data-testid="job-step">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock("@/components/dashboard/setup/steps/complete-step", () => ({
    CompleteStep: () => <div data-testid="complete-step">Done</div>,
}));

// Mock lucide-react icons to avoid rendering issues
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

describe("SetupWizard", () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render with welcome step initially", () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        expect(screen.getByTestId("welcome-step")).toBeInTheDocument();
        expect(screen.getByText("Quick Setup")).toBeInTheDocument();
    });

    it("should show all 7 steps when all permissions are granted", () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        // Sidebar should have all step titles
        expect(screen.getByText("Welcome")).toBeInTheDocument();
        expect(screen.getByText("Database Source")).toBeInTheDocument();
        expect(screen.getByText("Storage Destination")).toBeInTheDocument();
        expect(screen.getByText("Encryption")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("Backup Job")).toBeInTheDocument();
        expect(screen.getByText("Done!")).toBeInTheDocument();
    });

    it("should hide vault step when canCreateVault is false", () => {
        render(<SetupWizard canCreateVault={false} canCreateNotification={true} />);

        expect(screen.queryByText("Encryption")).not.toBeInTheDocument();
        // Other steps should still be visible
        expect(screen.getByText("Database Source")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("should hide notification step when canCreateNotification is false", () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={false} />);

        expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
        // Other steps should still be visible
        expect(screen.getByText("Encryption")).toBeInTheDocument();
        expect(screen.getByText("Database Source")).toBeInTheDocument();
    });

    it("should show only 5 steps when both optional permissions are denied", () => {
        render(<SetupWizard canCreateVault={false} canCreateNotification={false} />);

        expect(screen.queryByText("Encryption")).not.toBeInTheDocument();
        expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
        expect(screen.getByText("Welcome")).toBeInTheDocument();
        expect(screen.getByText("Database Source")).toBeInTheDocument();
        expect(screen.getByText("Storage Destination")).toBeInTheDocument();
        expect(screen.getByText("Backup Job")).toBeInTheDocument();
        expect(screen.getByText("Done!")).toBeInTheDocument();
    });

    it("should navigate from welcome to source step on Next", async () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        expect(screen.getByTestId("welcome-step")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Next" }));

        expect(screen.getByTestId("source-step")).toBeInTheDocument();
        expect(screen.queryByTestId("welcome-step")).not.toBeInTheDocument();
    });

    it("should navigate through all steps sequentially", async () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        // Welcome → Source
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("source-step")).toBeInTheDocument();

        // Source → Destination
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("destination-step")).toBeInTheDocument();

        // Destination → Vault
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("vault-step")).toBeInTheDocument();

        // Vault → Notification
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("notification-step")).toBeInTheDocument();

        // Notification → Job
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("job-step")).toBeInTheDocument();

        // Job → Complete
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("complete-step")).toBeInTheDocument();
    });

    it("should navigate back with Prev button", async () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        // Go to source step
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByTestId("source-step")).toBeInTheDocument();

        // Go back to welcome
        await user.click(screen.getByRole("button", { name: "Prev" }));
        expect(screen.getByTestId("welcome-step")).toBeInTheDocument();
    });

    it("should skip optional vault step", async () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        // Navigate to vault step
        await user.click(screen.getByRole("button", { name: "Next" })); // welcome → source
        await user.click(screen.getByRole("button", { name: "Next" })); // source → destination
        await user.click(screen.getByRole("button", { name: "Next" })); // destination → vault

        expect(screen.getByTestId("vault-step")).toBeInTheDocument();

        // Skip vault
        await user.click(screen.getByRole("button", { name: "Skip" }));

        // Should go to notification step
        expect(screen.getByTestId("notification-step")).toBeInTheDocument();
    });

    it("should skip optional notification step", async () => {
        render(<SetupWizard canCreateVault={false} canCreateNotification={true} />);

        // Navigate to notification step (vault is hidden)
        await user.click(screen.getByRole("button", { name: "Next" })); // welcome → source
        await user.click(screen.getByRole("button", { name: "Next" })); // source → destination
        await user.click(screen.getByRole("button", { name: "Next" })); // destination → notification

        expect(screen.getByTestId("notification-step")).toBeInTheDocument();

        // Skip notification
        await user.click(screen.getByRole("button", { name: "Skip" }));

        // Should go to job step
        expect(screen.getByTestId("job-step")).toBeInTheDocument();
    });

    it("should show progress bar", () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        expect(screen.getByText("Progress")).toBeInTheDocument();
        expect(screen.getByText("0 / 6")).toBeInTheDocument();
    });

    it("should update progress as steps are completed", async () => {
        render(<SetupWizard canCreateVault={true} canCreateNotification={true} />);

        expect(screen.getByText("0 / 6")).toBeInTheDocument();

        // Complete welcome step
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByText("1 / 6")).toBeInTheDocument();

        // Complete source step
        await user.click(screen.getByRole("button", { name: "Next" }));
        expect(screen.getByText("2 / 6")).toBeInTheDocument();
    });

    it("should skip directly from destination to job when both optional steps are hidden", async () => {
        render(<SetupWizard canCreateVault={false} canCreateNotification={false} />);

        // Navigate: welcome → source → destination → job (vault & notification are hidden)
        await user.click(screen.getByRole("button", { name: "Next" })); // welcome → source
        await user.click(screen.getByRole("button", { name: "Next" })); // source → destination
        await user.click(screen.getByRole("button", { name: "Next" })); // destination → job

        expect(screen.getByTestId("job-step")).toBeInTheDocument();
    });
});
