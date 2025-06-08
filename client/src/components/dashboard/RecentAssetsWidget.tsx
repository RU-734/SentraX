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
interface RecentAsset {
  id: number;
  name: string;
  type: string;
  ipAddress: string;
  createdAt: string; // Available, can be used for display if desired (e.g., "Added on X")
}

interface RecentAssetsWidgetProps {
  assets: RecentAsset[];
  isLoading: boolean;
  error: string | null;
}

const RecentAssetsWidget: React.FC<RecentAssetsWidgetProps> = ({ assets, isLoading, error }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Recently Added Assets</CardTitle>
        {/* Optional: <CardDescription>Top 5 most recent assets.</CardDescription> */}
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading recent assets...</p>}
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent assets found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Added On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <Link href={`/assets/${asset.id}`} className="hover:underline text-primary">
                        {asset.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{asset.type}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.ipAddress}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(asset.createdAt).toLocaleDateString()}
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

export default RecentAssetsWidget;
