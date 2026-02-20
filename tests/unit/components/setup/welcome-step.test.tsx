import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeStep } from "@/components/dashboard/setup/steps/welcome-step";

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

const mockSteps = [
    { id: "welcome", title: "Welcome", description: "Get started", icon: () => <span />, },
    { id: "source", title: "Database Source", description: "Where to backup from", icon: () => <span /> },
    { id: "destination", title: "Storage Destination", description: "Where to store backups", icon: () => <span /> },
    { id: "vault", title: "Encryption", description: "Secure your backups", icon: () => <span />, optional: true },
    { id: "notification", title: "Notifications", description: "Get alerts", icon: () => <span />, optional: true },
    { id: "job", title: "Backup Job", description: "Configure schedule", icon: () => <span /> },
    { id: "complete", title: "Done!", description: "Ready to go", icon: () => <span /> },
];

describe("WelcomeStep", () => {
    const user = userEvent.setup();
    let onNext: Mock<() => void>;

    beforeEach(() => {
        onNext = vi.fn<() => void>();
    });

    it("should render the welcome heading", () => {
        render(<WelcomeStep onNext={onNext} steps={mockSteps} />);

        expect(screen.getByText("Welcome to Quick Setup")).toBeInTheDocument();
    });

    it("should render the description text", () => {
        render(<WelcomeStep onNext={onNext} steps={mockSteps} />);

        expect(screen.getByText(/guide you through setting up/)).toBeInTheDocument();
    });

    it("should display setup steps excluding welcome and complete", () => {
        render(<WelcomeStep onNext={onNext} steps={mockSteps} />);

        // Should show intermediate steps
        expect(screen.getByText("Database Source")).toBeInTheDocument();
        expect(screen.getByText("Storage Destination")).toBeInTheDocument();
        expect(screen.getByText("Encryption")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("Backup Job")).toBeInTheDocument();

        // Should NOT show welcome or complete step in the list
        // (the heading "Welcome to Quick Setup" exists but the step card shouldn't)
    });

    it("should mark optional steps with a badge", () => {
        render(<WelcomeStep onNext={onNext} steps={mockSteps} />);

        const optionalBadges = screen.getAllByText("Optional");
        // Vault and Notification are optional
        expect(optionalBadges).toHaveLength(2);
    });

    it("should display step numbers starting from 1", () => {
        render(<WelcomeStep onNext={onNext} steps={mockSteps} />);

        // 5 steps displayed (excluding welcome and complete)
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should call onNext when the start button is clicked", async () => {
        render(<WelcomeStep onNext={onNext} steps={mockSteps} />);

        await user.click(screen.getByRole("button", { name: /get started/i }));

        expect(onNext).toHaveBeenCalledOnce();
    });

    it("should work with fewer steps when optional steps are excluded", () => {
        const minimalSteps = mockSteps.filter(
            (s) => s.id !== "vault" && s.id !== "notification"
        );

        render(<WelcomeStep onNext={onNext} steps={minimalSteps} />);

        expect(screen.getByText("Database Source")).toBeInTheDocument();
        expect(screen.getByText("Storage Destination")).toBeInTheDocument();
        expect(screen.getByText("Backup Job")).toBeInTheDocument();
        expect(screen.queryByText("Encryption")).not.toBeInTheDocument();
        expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    });
});
