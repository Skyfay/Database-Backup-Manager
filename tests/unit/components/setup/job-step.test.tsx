import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobStep } from "@/components/dashboard/setup/steps/job-step";
import type { WizardData } from "@/components/dashboard/setup/setup-wizard";

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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultWizardData: WizardData = {
    sourceId: "src-1",
    sourceName: "Production MySQL",
    destinationId: "dst-1",
    destinationName: "AWS S3 Backup",
    encryptionProfileId: "enc-1",
    encryptionProfileName: "Production Key",
    notificationIds: ["notif-1"],
    notificationNames: ["Discord Alerts"],
    jobId: null,
    jobName: null,
};

describe("JobStep", () => {
    const user = userEvent.setup();
    let onUpdate: ReturnType<typeof vi.fn>;
    let onNext: ReturnType<typeof vi.fn>;
    let onPrev: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onUpdate = vi.fn();
        onNext = vi.fn();
        onPrev = vi.fn();
        mockFetch.mockReset();
    });

    function renderJobStep(dataOverrides: Partial<WizardData> = {}) {
        return render(
            <JobStep
                wizardData={{ ...defaultWizardData, ...dataOverrides }}
                onUpdate={onUpdate}
                onNext={onNext}
                onPrev={onPrev}
            />
        );
    }

    it("should render the step title", () => {
        renderJobStep();

        expect(screen.getByText("Create Backup Job")).toBeInTheDocument();
    });

    it("should display the summary card with configured resources", () => {
        renderJobStep();

        expect(screen.getByText("Production MySQL")).toBeInTheDocument();
        expect(screen.getByText("AWS S3 Backup")).toBeInTheDocument();
        expect(screen.getByText("Production Key")).toBeInTheDocument();
        expect(screen.getByText("Discord Alerts")).toBeInTheDocument();
    });

    it("should not show encryption in summary when not configured", () => {
        renderJobStep({
            encryptionProfileId: null,
            encryptionProfileName: null,
        });

        expect(screen.queryByText("Production Key")).not.toBeInTheDocument();
    });

    it("should not show notifications in summary when not configured", () => {
        renderJobStep({
            notificationIds: [],
            notificationNames: [],
        });

        expect(screen.queryByText("Discord Alerts")).not.toBeInTheDocument();
    });

    it("should show the Job Name input field", () => {
        renderJobStep();

        expect(screen.getByLabelText("Job Name")).toBeInTheDocument();
    });

    it("should show schedule presets", () => {
        renderJobStep();

        expect(screen.getByText("Every hour")).toBeInTheDocument();
        expect(screen.getByText("Daily at midnight")).toBeInTheDocument();
        expect(screen.getByText("Weekly (Sunday midnight)")).toBeInTheDocument();
    });

    it("should show the cron expression input with default value", () => {
        renderJobStep();

        const cronInput = screen.getByLabelText("Cron Expression");
        expect(cronInput).toHaveValue("0 0 * * *");
    });

    it("should show compression select with GZIP as default", () => {
        renderJobStep();

        expect(screen.getAllByText("Gzip (Recommended)").length).toBeGreaterThan(0);
    });

    it("should show notification trigger select when notifications are configured", () => {
        renderJobStep();

        expect(screen.getByText("Notification Trigger")).toBeInTheDocument();
    });

    it("should not show notification trigger select when no notifications", () => {
        renderJobStep({
            notificationIds: [],
            notificationNames: [],
        });

        expect(screen.queryByText("Notification Trigger")).not.toBeInTheDocument();
    });

    it("should show Back and Create Job buttons", () => {
        renderJobStep();

        expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /create job/i })).toBeInTheDocument();
    });

    it("should call onPrev when Back is clicked", async () => {
        renderJobStep();

        await user.click(screen.getByRole("button", { name: /back/i }));

        expect(onPrev).toHaveBeenCalledOnce();
    });

    it("should submit the job and call onUpdate + onNext on success", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ id: "job-123" }),
        });

        renderJobStep();

        // Fill in job name
        await user.type(screen.getByLabelText("Job Name"), "Daily Backup");

        // Submit
        await user.click(screen.getByRole("button", { name: /create job/i }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/jobs", expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/json" },
            }));
        });

        // Should update wizard data with job ID
        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith({
                jobId: "job-123",
                jobName: "Daily Backup",
            });
        });

        // Should auto-advance
        await waitFor(() => {
            expect(onNext).toHaveBeenCalled();
        });
    });

    it("should include correct payload in the API call", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ id: "job-123" }),
        });

        renderJobStep();

        await user.type(screen.getByLabelText("Job Name"), "My Backup");
        await user.click(screen.getByRole("button", { name: /create job/i }));

        await waitFor(() => {
            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body).toMatchObject({
                name: "My Backup",
                sourceId: "src-1",
                destinationId: "dst-1",
                encryptionProfileId: "enc-1",
                compression: "GZIP",
                enabled: true,
                notificationIds: ["notif-1"],
                notificationEvents: "ALWAYS",
                schedule: "0 0 * * *",
            });
        });
    });

    it("should show error toast on API failure", async () => {
        const { toast } = await import("sonner");
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Name already taken" }),
        });

        renderJobStep();

        await user.type(screen.getByLabelText("Job Name"), "My Backup");
        await user.click(screen.getByRole("button", { name: /create job/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Name already taken");
        });
    });

    it("should show saved state when wizardData already has jobId", () => {
        renderJobStep({
            jobId: "job-existing",
            jobName: "Existing Backup Job",
        });

        expect(screen.getByText("Backup Job Created")).toBeInTheDocument();
        expect(screen.getByText("Existing Backup Job")).toBeInTheDocument();
    });

    it("should update cron expression when a preset is clicked", async () => {
        renderJobStep();

        await user.click(screen.getByRole("button", { name: "Every hour" }));

        const cronInput = screen.getByLabelText("Cron Expression");
        expect(cronInput).toHaveValue("0 * * * *");
    });
});
