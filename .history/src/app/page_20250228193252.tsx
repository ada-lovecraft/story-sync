import { api, HydrateClient } from "@/trpc/server";
import { MainLayout } from "./_components/layout/main-layout";
import { Button } from "./_components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./_components/ui/card";

export default async function Home() {
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
        </div>
      </MainLayout>
    </HydrateClient>
  );
}
