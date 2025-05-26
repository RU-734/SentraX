import React from 'react';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Matching the interface from DashboardPage.tsx
interface RecentVulnerabilityInstance {
  joinId: number; // ID from the assets_vulnerabilities join table
  vulnerabilityName: string;
  vulnerabilitySeverity: string;
  assetName: string;
  assetIpAddress: string; // Available if needed, not explicitly requested for display here
  lastSeenOrUpdatedAt: string;
  // assetId is not directly in this flat structure from backend,
  // but assetName implies an asset. Link will go to general /assets for now.
}

interface RecentVulnerabilitiesWidgetProps {
  vulnerabilities: RecentVulnerabilityInstance[];
  isLoading: boolean;
  error: string | null;
}

const severityColorMap: { [key: string]: string } = {
  critical: 'text-red-600 font-semibold',
  high: 'text-orange-500 font-semibold',
  medium: 'text-yellow-600',
  low: 'text-blue-500',
  informational: 'text-gray-500',
};

const RecentVulnerabilitiesWidget: React.FC<RecentVulnerabilitiesWidgetProps> = ({
  vulnerabilities,
  isLoading,
  error,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Recently Active Vulnerabilities</CardTitle>
        {/* Optional: <CardDescription>Top 5 most recent open vulnerability instances.</CardDescription> */}
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading recent vulnerabilities...</p>}
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          vulnerabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recently active open vulnerabilities found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vulnerability</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vulnerabilities.map(vuln => (
                  <TableRow key={vuln.joinId}>
                    <TableCell className="font-medium">{vuln.vulnerabilityName}</TableCell>
                    <TableCell className={severityColorMap[vuln.vulnerabilitySeverity?.toLowerCase()] || 'text-gray-600'}>
                      {vuln.vulnerabilitySeverity || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/assets`} className="hover:underline text-primary">
                        {vuln.assetName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(vuln.lastSeenOrUpdatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default RecentVulnerabilitiesWidget;
