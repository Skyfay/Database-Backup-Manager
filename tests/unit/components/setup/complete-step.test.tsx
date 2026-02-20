import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompleteStep } from "@/components/dashboard/setup/steps/complete-step";
import type { WizardData } from "@/components/dashboard/setup/setup-wizard";

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
        <a href={href} {...props}>{children}</a>
    ),
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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CompleteStep", () => {
    const user = userEvent.setup();
    const fullWizardData: WizardData = {
        sourceId: "src-1",
        sourceName: "Production MySQL",
        destinationId: "dst-1",
        destinationName: "AWS S3 Backup",
        encryptionProfileId: "enc-1",
        encryptionProfileName: "Production Key",
        notificationIds: ["notif-1"],
        notificationNames: ["Discord Alerts"],
        jobId: "job-1",
        jobName: "Daily Backup",
    };

    beforeEach(() => {
        mockFetch.mockReset();
        // Reset window.location mock
        Object.defineProperty(window, "location", {
            writable: true,
            value: { href: "" },
        });
    });

    it("should render the success heading", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByText("Setup Complete!")).toBeInTheDocument();
    });

    it("should display the source name in summary", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByText("Production MySQL")).toBeInTheDocument();
        expect(screen.getByText("Database Source")).toBeInTheDocument();
    });

    it("should display the destination name in summary", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByText("AWS S3 Backup")).toBeInTheDocument();
        expect(screen.getByText("Storage Destination")).toBeInTheDocument();
    });

    it("should display encryption profile when set", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByText("Production Key")).toBeInTheDocument();
        expect(screen.getByText("Encryption")).toBeInTheDocument();
    });

    it("should not display encryption section when not set", () => {
        const dataWithoutEncryption = {
            ...fullWizardData,
            encryptionProfileId: null,
            encryptionProfileName: null,
        };

        render(<CompleteStep wizardData={dataWithoutEncryption} />);

        expect(screen.queryByText("Encryption")).not.toBeInTheDocument();
    });

    it("should display notifications when set", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByText("Discord Alerts")).toBeInTheDocument();
    });

    it("should not display notification section when no notifications", () => {
        const dataWithoutNotifications = {
            ...fullWizardData,
            notificationIds: [],
            notificationNames: [],
        };

        render(<CompleteStep wizardData={dataWithoutNotifications} />);

        // "Notifications" label should not appear in summary (it is a section label)
        const notificationLabels = screen.queryAllByText("Notifications");
        expect(notificationLabels).toHaveLength(0);
    });

    it("should display the job name in summary", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByText("Daily Backup")).toBeInTheDocument();
        expect(screen.getByText("Backup Job")).toBeInTheDocument();
    });

    it("should show Run First Backup Now button when jobId exists", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        expect(screen.getByRole("button", { name: /run first backup now/i })).toBeInTheDocument();
    });

    it("should not show Run button when jobId is null", () => {
        const dataWithoutJob = { ...fullWizardData, jobId: null };

        render(<CompleteStep wizardData={dataWithoutJob} />);

        expect(screen.queryByRole("button", { name: /run first backup now/i })).not.toBeInTheDocument();
    });

    it("should call fetch to run the job when Run button is clicked", async () => {
        mockFetch.mockResolvedValue({ ok: true });

        render(<CompleteStep wizardData={fullWizardData} />);

        await user.click(screen.getByRole("button", { name: /run first backup now/i }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/jobs/job-1/run", {
                method: "POST",
            });
        });
    });

    it("should redirect to history page after running the job", async () => {
        mockFetch.mockResolvedValue({ ok: true });

        render(<CompleteStep wizardData={fullWizardData} />);

        await user.click(screen.getByRole("button", { name: /run first backup now/i }));

        await waitFor(() => {
            expect(window.location.href).toBe("/dashboard/history");
        });
    });

    it("should show Go to Dashboard and Manage Jobs links", () => {
        render(<CompleteStep wizardData={fullWizardData} />);

        const dashboardLink = screen.getByRole("link", { name: /go to dashboard/i });
        expect(dashboardLink).toHaveAttribute("href", "/dashboard");

        const jobsLink = screen.getByRole("link", { name: /manage jobs/i });
        expect(jobsLink).toHaveAttribute("href", "/dashboard/jobs");
    });

    it("should display multiple notification names joined by comma", () => {
        const dataWithMultipleNotifications = {
            ...fullWizardData,
            notificationIds: ["notif-1", "notif-2"],
            notificationNames: ["Discord Alerts", "Email Alerts"],
        };

        render(<CompleteStep wizardData={dataWithMultipleNotifications} />);

        expect(screen.getByText("Discord Alerts, Email Alerts")).toBeInTheDocument();
    });
});
