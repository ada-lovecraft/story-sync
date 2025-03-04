import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePreview } from "./file-preview";

// Mock the logger to avoid console noise in tests
vi.mock("@/lib/logger", () => ({
    createLogger: () => ({
        log: vi.fn(),
        err: vi.fn(),
    }),
}));

// Mock react-markdown to avoid issues with its rendering in tests
vi.mock("react-markdown", () => ({
    default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}));

describe("FilePreview", () => {
    const mockFile = new File(["test content"], "test.txt", { type: "text/plain" });
    const mockJsonFile = new File(['{"name": "test", "value": 123}'], "test.json", { type: "application/json" });
    const mockMarkdownFile = new File(["# Heading\n\nText content"], "test.md", { type: "text/markdown" });

    const mockContent = "test content";
    const mockJsonContent = '{"name": "test", "value": 123}';
    const mockMarkdownContent = "# Heading\n\nText content";

    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        mockOnConfirm.mockClear();
        mockOnCancel.mockClear();
    });

    it("renders plain text content correctly", () => {
        render(
            <FilePreview
                file={mockFile}
                content={mockContent}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByText("test content")).toBeInTheDocument();
        expect(screen.getByText(/Preview: test.txt/)).toBeInTheDocument();
    });

    it("renders JSON content with formatting options", () => {
        render(
            <FilePreview
                file={mockJsonFile}
                content={mockJsonContent}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        // Check that raw tab exists
        expect(screen.getByRole("tab", { name: "Raw" })).toBeInTheDocument();

        // Check that JSON tab exists
        expect(screen.getByRole("tab", { name: "JSON" })).toBeInTheDocument();

        // Content should be visible in raw format initially
        expect(screen.getByText(mockJsonContent)).toBeInTheDocument();

        // Switch to JSON tab
        fireEvent.click(screen.getByRole("tab", { name: "JSON" }));

        // Formatted JSON should be visible (we're not testing exact formatting, just presence)
        expect(screen.getByText(/"name": "test"/)).toBeInTheDocument();
    });

    it("renders Markdown content with formatting options", () => {
        render(
            <FilePreview
                file={mockMarkdownFile}
                content={mockMarkdownContent}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        // Check that raw tab exists
        expect(screen.getByRole("tab", { name: "Raw" })).toBeInTheDocument();

        // Check that Markdown tab exists
        expect(screen.getByRole("tab", { name: "Markdown" })).toBeInTheDocument();

        // Switch to Markdown tab
        fireEvent.click(screen.getByRole("tab", { name: "Markdown" }));

        // Markdown content should be rendered via the mock
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    });

    it("calls onConfirm when confirm button is clicked", () => {
        render(
            <FilePreview
                file={mockFile}
                content={mockContent}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Upload File/i }));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when cancel button is clicked", () => {
        render(
            <FilePreview
                file={mockFile}
                content={mockContent}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("handles Show more/less toggle correctly", () => {
        // Create a long content file that would trigger truncation
        const longContent = Array(100).fill("Line of text").join("\n");
        const longFile = new File([longContent], "long.txt", { type: "text/plain" });

        render(
            <FilePreview
                file={longFile}
                content={longContent}
                onConfirm={mockOnConfirm}
                onCancel={mockOnCancel}
            />
        );

        // Initially should show the "Show more" button
        const showMoreButton = screen.getByRole("button", { name: /Show more/i });
        expect(showMoreButton).toBeInTheDocument();

        // Click to show more
        fireEvent.click(showMoreButton);

        // Now should show "Show less" button
        expect(screen.getByRole("button", { name: /Show less/i })).toBeInTheDocument();
    });
}); 