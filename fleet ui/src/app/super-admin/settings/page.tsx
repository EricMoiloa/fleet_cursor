import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="grid gap-6">
            <h1 className="text-3xl font-bold font-headline">System Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">System-wide settings and configurations will be managed here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
