import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Check, X, Users, UserCheck, ParkingCircle, CalendarCheck2, Coins } from 'lucide-react';
import { OwnersVerify } from './OwnersVerify';
import { useLanguage } from '../../contexts/LanguageContext';

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>({});
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);

  useEffect(() => {
    fetchStats();
    fetchPendingOwners();
  }, []);

  const fetchStats = async () => {
    // ...เหมือนเดิม...
    // Users
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    // Owners
    const { count: totalOwners } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'owner');
    // Spots
    const { count: totalSpots } = await supabase.from('parking_spots').select('*', { count: 'exact', head: true });
    // Bookings
    const { count: totalBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
    const { count: bookings30d } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    // Revenue
    const { data: completedBookings } = await supabase
        .from('bookings')
        .select('total_cost')
        .eq('status', 'completed');

    const totalRevenue = completedBookings
        ? completedBookings.reduce((sum, b) => sum + Number(b.price || 0), 0)
        : 0;

    setStats({
        totalUsers,
        activeUsers,
        totalOwners,
        totalSpots,
        totalBookings,
        bookings30d,
        totalRevenue,
    });
    };

  const fetchPendingOwners = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'owner')
      .eq('verify_status', 'pending');
    setPendingOwners(data || []);
  };

  const handleVerify = async (ownerId: string, approved: boolean) => {
    await supabase
      .from('profiles')
      .update({ verify_status: approved ? 'approved' : 'rejected' })
      .eq('id', ownerId);
    setPendingOwners(pendingOwners.filter(o => o.id !== ownerId));
    setSelectedOwner(null);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <h1 className="text-3xl font-extrabold mb-8 text-blue-800 flex items-center gap-2">
        <ParkingCircle className="text-blue-500" size={32} /> {t('admin_dashboard')}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Stat icon={<Users className="text-blue-500" />} label={t('total_users')} value={stats.totalUsers} />
        <Stat icon={<UserCheck className="text-green-500" />} label="Active Users (30d)" value={stats.activeUsers} />
        <Stat icon={<ParkingCircle className="text-yellow-500" />} label={t('total_owners')} value={stats.totalOwners} />
        <Stat icon={<ParkingCircle className="text-indigo-500" />} label="Total Spots" value={stats.totalSpots} />
        <Stat icon={<CalendarCheck2 className="text-pink-500" />} label="Total Bookings" value={stats.totalBookings} />
        <Stat icon={<CalendarCheck2 className="text-purple-500" />} label="Bookings (30d)" value={stats.bookings30d} />
        <Stat icon={<Coins className="text-amber-500" />} label="Total Revenue" value={`฿${stats.totalRevenue?.toLocaleString()}`} />
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <OwnersVerify />
      </div>

      {selectedOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative">
            <button
              onClick={() => setSelectedOwner(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200"
              title={t('close')}
            >
              <X />
            </button>
            <div className="font-bold text-lg mb-4 text-blue-700">Owner Document</div>
            <img
              src={selectedOwner.identity_document_url}
              alt="Document"
              className="w-full mb-4 rounded shadow"
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleVerify(selectedOwner.id, false)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex-1 flex items-center justify-center gap-2 shadow"
              >
                <X /> Reject
              </button>
              <button
                onClick={() => handleVerify(selectedOwner.id, true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex-1 flex items-center justify-center gap-2 shadow"
              >
                <Check /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center gap-2 border border-blue-100">
    <div className="text-3xl">{icon}</div>
    <div className="text-2xl font-bold">{value ?? '-'}</div>
    <div className="text-gray-600 text-sm">{label}</div>
  </div>
);

export default AdminDashboard;