import React from 'react';
import { Link } from 'wouter';

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
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Recently Added Assets</h3>
      {isLoading && <p className="text-gray-500">Loading recent assets...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!isLoading && !error && (
        assets.length === 0 ? (
          <p className="text-gray-500">No recent assets found.</p>
        ) : (
          <ul className="space-y-3">
            {assets.map(asset => (
              <li key={asset.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <Link href={`/assets`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                      {asset.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      Added: {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm text-gray-700">{asset.type}</p>
                     <p className="text-xs text-gray-500">{asset.ipAddress}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};

export default RecentAssetsWidget;
