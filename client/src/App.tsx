import React from 'react';
import { Link, Route, Switch, Redirect, useLocation } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AssetsPage from './pages/AssetsPage'; // Import AssetsPage
import AddAssetPage from './pages/AddAssetPage'; // Import AddAssetPage
import EditAssetPage from './pages/EditAssetPage'; // Import EditAssetPage
import AddVulnerabilityPage from './pages/AddVulnerabilityPage'; // Import AddVulnerabilityPage
import EditVulnerabilityPage from './pages/EditVulnerabilityPage'; // Import EditVulnerabilityPage
import ProtectedRoute from './components/ProtectedRoute';
import Button from './components/ui/Button'; // For the logout button

// AppContent will contain the navigation and routing logic,
// and can use the useAuth hook because it's a child of AuthProvider.
const AppContent: React.FC = () => {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation(); // For programmatic navigation

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login'); // Redirect to login after logout
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show an error message to the user
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold hover:text-gray-300">
            MyApp
          </Link>
          <div className="space-x-4">
            {isLoading ? (
              <span>Loading...</span>
            ) : isAuthenticated ? (
              <>
                <Link href="/dashboard" className="hover:text-gray-300">
                  Dashboard
                </Link>
                <Link href="/assets" className="hover:text-gray-300">
                  Assets
                </Link>
                <Button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-700 text-white"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-gray-300">
                  Login
                </Link>
                <Link href="/register" className="hover:text-gray-300">
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-grow container mx-auto px-6 py-8">
        <Switch>
          <Route path="/login">
            {isAuthenticated && !isLoading ? <Redirect to="/dashboard" /> : <LoginPage />}
          </Route>
          <Route path="/register">
             {isAuthenticated && !isLoading ? <Redirect to="/dashboard" /> : <RegisterPage />}
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          </Route>
          <Route path="/assets">
            <ProtectedRoute>
              <AssetsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/assets/new">
            <ProtectedRoute>
              <AddAssetPage />
            </ProtectedRoute>
          </Route>
          <Route path="/assets/edit/:assetId">
            {(params) => ( // Wouter provides params directly to children function if path matches
              <ProtectedRoute>
                <EditAssetPage /> 
                {/* EditAssetPage uses useRoute to get assetId, so no need to pass params explicitly here */}
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/vulnerabilities/new">
            <ProtectedRoute>
              <AddVulnerabilityPage />
            </ProtectedRoute>
          </Route>
          <Route path="/vulnerabilities/:id/edit">
             {/* EditVulnerabilityPage uses useRoute to get ID, so no need to pass params explicitly here */}
            <ProtectedRoute>
              <EditVulnerabilityPage />
            </ProtectedRoute>
          </Route>
          <Route path="/">
            {isLoading ? (
              <div>Loading...</div> // Or some placeholder
            ) : isAuthenticated ? (
              <Redirect to="/dashboard" />
            ) : (
              <Redirect to="/login" />
            )}
          </Route>
          {/* Fallback for 404 or other routes */}
          <Route>
            <div className="text-center py-10">
              <h1 className="text-3xl font-bold">404 - Page Not Found</h1>
              <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">
                Go Home
              </Link>
            </div>
          </Route>
        </Switch>
      </main>
      <footer className="bg-gray-200 text-center p-4 text-sm text-gray-600">
        © {new Date().getFullYear()} MyApp. All rights reserved.
      </footer>
    </div>
  );
};

// The main App component wraps everything with AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
