import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Car, Route } from "lucide-react";

export default function SuperAdminDashboard() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Global oversight of the FleetWise platform.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Ministries" value="3" icon={Building} change="+1 this month" />
        <KpiCard title="Total Users" value="128" icon={Users} change="+20 this month" />
        <KpiCard title="Total Vehicles" value="45" icon={Car} change="+5 this month" />
        <KpiCard title="Trips Today" value="12" icon={Route} change="2 active" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>An overview of recent actions across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Mary Admin</TableCell>
                <TableCell><Badge variant="secondary">CREATE</Badge></TableCell>
                <TableCell>Vehicle: GVT-004</TableCell>
                <TableCell className="text-right">5 minutes ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Frank Manager</TableCell>
                <TableCell><Badge className="bg-accent text-accent-foreground">APPROVE</Badge></TableCell>
                <TableCell>Request: #REQ-002</TableCell>
                <TableCell className="text-right">1 hour ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>David Driver</TableCell>
                <TableCell><Badge>START TRIP</Badge></TableCell>
                <TableCell>Trip: #TRP-001</TableCell>
                <TableCell className="text-right">3 hours ago</TableCell>
              </TableRow>
               <TableRow>
                <TableCell>Sam Admin</TableCell>
                <TableCell><Badge variant="secondary">CREATE</Badge></TableCell>
                <TableCell>Ministry: Ministry of Health</TableCell>
                <TableCell className="text-right">1 day ago</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
