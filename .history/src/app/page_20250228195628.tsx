import { api, HydrateClient } from "@/trpc/server";
import { MainLayout } from "./_components/layout/main-layout";
import { Button } from "./_components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./_components/ui/card";
import { WorkflowStep } from "@/hooks/use-workflow-data";
import { FileUploadStep } from "./_components/workflow/file-upload-step";

export default function Home() {
  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to ChatLog Cleaner</h1>
            <p className="text-muted-foreground">
              Upload a chat log or select an existing one to get started.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Upload New File</CardTitle>
                <CardDescription>Upload a new chat log file to begin the cleaning process.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button>Upload</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Files</CardTitle>
                <CardDescription>Continue working with recently uploaded files.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No recent files found.</p>
              </CardContent>
            </Card>
          </div>
          <WorkflowContent />
        </div>
      </MainLayout>
    </HydrateClient>
  );
}

function WorkflowContent() {
  // This component renders the current workflow step
  // Currently only implementing step 1 (file upload)

  return (
    <div>
      <FileUploadStep />
    </div>
  );
}
