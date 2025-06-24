
import { useAuth } from '../contexts/AuthContext';
import { LandingPage } from './LandingPage';
import { HomePage } from './ีuser/HomePage';
import { AdminDashboard } from './admin/AdminDashboard';
import { Navbar } from '../components/Navbar';

const Index = () => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />;
  }

  // Show admin dashboard with navbar for parking owners
  if (profile?.user_type === 'owner') {
    return (
      <>
        <Navbar />
        <div className="pt-16">
          <AdminDashboard />
        </div>
      </>
    );
  }

  // Show home page for guests and 'both' user types
  return (
    <>
      <HomePage />
    </>
  );
};

export default Index;
