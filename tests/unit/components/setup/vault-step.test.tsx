import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VaultStep } from "@/components/dashboard/setup/steps/vault-step";
import type { WizardData } from "@/components/dashboard/setup/setup-wizard";

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock createEncryptionProfile server action
const mockCreateEncryptionProfile = vi.fn();
vi.mock("@/app/actions/encryption", () => ({
    createEncryptionProfile: (...args: unknown[]) => mockCreateEncryptionProfile(...args),
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

describe("VaultStep", () => {
    const user = userEvent.setup();
    let onUpdate: ReturnType<typeof vi.fn>;
    let onNext: ReturnType<typeof vi.fn>;
    let onPrev: ReturnType<typeof vi.fn>;
    let onSkip: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onUpdate = vi.fn();
        onNext = vi.fn();
        onPrev = vi.fn();
        onSkip = vi.fn();
        mockCreateEncryptionProfile.mockReset();
    });

    function renderVaultStep(wizardDataOverrides: Partial<WizardData> = {}) {
        return render(
            <VaultStep
                wizardData={{ ...defaultWizardData, ...wizardDataOverrides }}
                onUpdate={onUpdate}
                onNext={onNext}
                onPrev={onPrev}
                onSkip={onSkip}
            />
        );
    }

    it("should render the form when no profile is created yet", () => {
        renderVaultStep();

        expect(screen.getByText("Backup Encryption")).toBeInTheDocument();
        expect(screen.getByLabelText("Profile Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    });

    it("should render the info card about encryption", () => {
        renderVaultStep();

        expect(screen.getByText("Why encrypt your backups?")).toBeInTheDocument();
        expect(screen.getAllByText(/AES-256-GCM/).length).toBeGreaterThan(0);
    });

    it("should show Skip and Back buttons", () => {
        renderVaultStep();

        expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should disable Create button when name is empty", () => {
        renderVaultStep();

        const createButton = screen.getByRole("button", { name: /create & continue/i });
        expect(createButton).toBeDisabled();
    });

    it("should enable Create button when name is provided", async () => {
        renderVaultStep();

        await user.type(screen.getByLabelText("Profile Name"), "Test Key");

        const createButton = screen.getByRole("button", { name: /create & continue/i });
        expect(createButton).toBeEnabled();
    });

    it("should call createEncryptionProfile on submit", async () => {
        mockCreateEncryptionProfile.mockResolvedValue({
            success: true,
            data: { id: "enc-123" },
        });

        renderVaultStep();

        await user.type(screen.getByLabelText("Profile Name"), "My Vault Key");
        await user.type(screen.getByLabelText("Description (optional)"), "Test description");
        await user.click(screen.getByRole("button", { name: /create & continue/i }));

        await waitFor(() => {
            expect(mockCreateEncryptionProfile).toHaveBeenCalledWith("My Vault Key", "Test description");
        });
    });

    it("should update wizard data and show success state on successful creation", async () => {
        mockCreateEncryptionProfile.mockResolvedValue({
            success: true,
            data: { id: "enc-123" },
        });

        renderVaultStep();

        await user.type(screen.getByLabelText("Profile Name"), "My Vault Key");
        await user.click(screen.getByRole("button", { name: /create & continue/i }));

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith({
                encryptionProfileId: "enc-123",
                encryptionProfileName: "My Vault Key",
            });
        });

        // Should show success state
        await waitFor(() => {
            expect(screen.getByText("Encryption Profile Created")).toBeInTheDocument();
        });
    });

    it("should show toast error on failed creation", async () => {
        const { toast } = await import("sonner");
        mockCreateEncryptionProfile.mockResolvedValue({
            success: false,
            error: "Name already exists",
        });

        renderVaultStep();

        await user.type(screen.getByLabelText("Profile Name"), "Duplicate Key");
        await user.click(screen.getByRole("button", { name: /create & continue/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Name already exists");
        });
    });

    it("should show toast error when name is empty and trimmed", async () => {
        const { toast } = await import("sonner");
        renderVaultStep();

        // Type only spaces
        await user.type(screen.getByLabelText("Profile Name"), "   ");
        // Button should be disabled since trimmed value is empty
        const createButton = screen.getByRole("button", { name: /create & continue/i });
        expect(createButton).toBeDisabled();
    });

    it("should show saved state when wizardData already has encryptionProfileId", () => {
        renderVaultStep({
            encryptionProfileId: "enc-existing",
            encryptionProfileName: "Existing Key",
        });

        expect(screen.getByText("Encryption Profile Created")).toBeInTheDocument();
        expect(screen.getByText("Existing Key")).toBeInTheDocument();
    });

    it("should call onPrev when Back is clicked", async () => {
        renderVaultStep();

        await user.click(screen.getByRole("button", { name: /back/i }));

        expect(onPrev).toHaveBeenCalledOnce();
    });

    it("should call onSkip when Skip is clicked", async () => {
        renderVaultStep();

        await user.click(screen.getByRole("button", { name: /skip/i }));

        expect(onSkip).toHaveBeenCalledOnce();
    });

    it("should call onNext from saved state Continue button", async () => {
        renderVaultStep({
            encryptionProfileId: "enc-existing",
            encryptionProfileName: "Existing Key",
        });

        await user.click(screen.getByRole("button", { name: /continue/i }));

        expect(onNext).toHaveBeenCalledOnce();
    });
});
