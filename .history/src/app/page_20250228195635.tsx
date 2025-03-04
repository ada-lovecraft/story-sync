import { FileUploadStep } from "./_components/workflow/file-upload-step";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-between p-6">
      <div className="z-10 w-full items-center justify-center font-mono text-sm">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8 text-center">
            ChatLog Cleaner
          </h1>

          {/* Workflow content - currently only showing file upload step */}
          <FileUploadStep />
        </div>
      </div>
    </main>
  );
}
