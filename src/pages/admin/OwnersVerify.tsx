import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Check, X } from 'lucide-react';

export const OwnersVerify: React.FC = () => {
  const [owners, setOwners] = useState<any[]>([]);
  const [pendingSpots, setPendingSpots] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // โหลด owner ที่รออนุมัติ
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
    console.log('Session:', data.session);
    // ดู payload JWT
    if (data.session) {
      const userRole = data.session.user.user_metadata?.role;
      console.log('User role from user_metadata:', userRole);
    }
  });
    
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'owner')
      .eq('verify_status', 'pending')
      .then(({ data }) => setOwners(data || []));
  }, []);

  // โหลดจุดจอดที่รออนุมัติ
  useEffect(() => {
    supabase
      .from('parking_spots')
      .select('*')
      .eq('is_approved', false)
      .then(({ data }) => setPendingSpots(data || []));
  }, []);

  // อนุมัติ/ปฏิเสธ owner
    const handleVerifyOwner = async (ownerId: string, approved: boolean) => {
      try {
        const res = await fetch('http://park-pass-server.vercel.app/api/verify-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId, approved }),
        });
        const result = await res.json();
        if (result.error) {
          alert('เกิดข้อผิดพลาด: ' + result.error);
          return;
        }
        // โหลด owners ใหม่
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'owner')
          .eq('verify_status', 'pending');
        setOwners(data || []);
        setSelectedOwner(null);
      } catch (err: any) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
      }
    };


  // อนุมัติ/ปฏิเสธจุดจอด
  const handleVerifySpot = async (spotId: string, approved: boolean) => {
    try {
      const res = await fetch('http://park-pass-server.vercel.app/api/verify-spot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotId, approved }),
      });
      const result = await res.json();
      if (result.error) {
        alert('เกิดข้อผิดพลาด: ' + result.error);
        return;
      }
      // โหลดจุดจอดที่รออนุมัติใหม่
      const { data } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('is_approved', false);
      setPendingSpots(data || []);
      setSelectedSpot(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Verification Center</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Owner Verification */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-blue-700">Pending Owner Approval</h3>
          {owners.length === 0 && (
            <div className="text-gray-400 text-center py-8">No pending owners.</div>
          )}
          <div className="space-y-4">
            {owners.map(owner => (
              <div key={owner.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex justify-between items-center">
                <div>
                    <div className="font-semibold text-blue-900">{owner.name}</div>
                    <div className="text-gray-500">{owner.email}</div>
                </div>
                <button onClick={() => setSelectedOwner(owner)} className="p-2 rounded-full hover:bg-blue-50 transition" title="View Details">
                    <Eye className="text-blue-600" />
                </button>
                </div>
            ))}
          </div>
        </div>
        {/* Parking Spot Verification */}
        <div>
        <h3 className="text-lg font-semibold mb-4 text-green-700">Pending Parking Spot Approval</h3>
        {pendingSpots.length === 0 && (
            <div className="text-gray-400 text-center py-8">No pending parking spots.</div>
        )}
        <div className="space-y-4">
            {pendingSpots.map(spot => (
            <div
                key={spot.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex justify-between items-center"
            >
                <div>
                <div className="font-semibold text-green-900">{spot.name}</div>
                <div className="text-gray-500">{spot.address}</div>
                </div>
                <button
                onClick={() => setSelectedSpot(spot)}
                className="p-2 rounded-full hover:bg-green-50 transition"
                title="View Details"
                >
                <Eye className="text-green-600" />
                </button>
            </div>
            ))}
        </div>
        </div>

      {/* Owner Modal */}
        {selectedOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <div className="font-bold text-blue-700">Owner Document</div>
                <button onClick={() => setSelectedOwner(null)}><X /></button>
            </div>
            <div className="mb-4">
                <div className="font-semibold mb-1">Document:</div>
                {selectedOwner.identity_document_url ? (
                <img
                    src={selectedOwner.identity_document_url}
                    alt="Document"
                    className="w-full mb-2 rounded border"
                    onError={e => (e.currentTarget.style.display = 'none')}
                />
                ) : (
                <div className="text-red-500 text-sm">No document uploaded.</div>
                )}
            </div>
            <div className="mb-2"><b>Name:</b> {selectedOwner.name}</div>
            <div className="mb-2"><b>Email:</b> {selectedOwner.email}</div>
            <div className="mb-2"><b>Phone:</b> {selectedOwner.phone || '-'}</div>
            <div className="mb-2"><b>Business Name:</b> {selectedOwner.business_name || selectedOwner.business_name || '-'}</div>
            <div className="mb-2"><b>Business Address:</b> {selectedOwner.business_address || selectedOwner.business_address || '-'}</div>
            <div className="flex gap-2 mt-4">
            <button
                onClick={() => handleVerifyOwner(selectedOwner.id, false)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl font-semibold flex-1 flex items-center justify-center gap-2 shadow"
            >
                <X /> Reject
            </button>
            <button
                onClick={() => handleVerifyOwner(selectedOwner.id, true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl font-semibold flex-1 flex items-center justify-center gap-2 shadow"
            >
                <Check /> Approve
            </button>
            </div>
            </div>
        </div>
        )}

      {/* Parking Spot Modal */}
      {selectedSpot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-blue-700 text-lg">Parking Spot Details</div>
              <button onClick={() => setSelectedSpot(null)} className="text-gray-500 hover:text-red-500">
                <X />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <div><b>Name:</b> {selectedSpot.name}</div>
              <div><b>Address:</b> {selectedSpot.address}</div>
              <div><b>Description:</b> {selectedSpot.description}</div>
              <div><b>Price:</b> {selectedSpot.price} / {selectedSpot.price_type}</div>
              <div><b>Amenities:</b> {(selectedSpot.amenities || []).join(', ')}</div>
              <div><b>Images:</b></div>
              <div className="flex gap-2 mb-2 flex-wrap">
                {(selectedSpot.images || []).length > 0 ? (
                  (selectedSpot.images || []).map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      className="block focus:outline-none"
                      title="Click to enlarge"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img}
                        alt="spot"
                        className="w-20 h-20 object-cover rounded border hover:scale-110 transition-transform"
                      />
                    </button>
                  ))
                ) : (
                  <div className="text-gray-400 italic">No images</div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleVerifySpot(selectedSpot.id, false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
              >
                <X /> Reject
              </button>
              <button
                onClick={() => handleVerifySpot(selectedSpot.id, true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
              >
                <Check /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]">
          <div className="relative">
            <img
              src={selectedImage}
              alt="Enlarged"
              className="max-w-[90vw] max-h-[80vh] rounded-xl shadow-lg border-4 border-white"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}
      
    </div>
    </div>
  );
};
