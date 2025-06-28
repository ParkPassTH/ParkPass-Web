import React, { createContext, useContext, useState, useEffect } from 'react';

interface Translations {
  [key: string]: {
    en: string;
    th: string;
  };
}

const translations: Translations = {
  // Landing Page
  'landing_sign_in': {
    en: 'Sign In',
    th: 'เข้าสู่ระบบ'
  },
  'find_perfect_parking_spots': {
    en: 'Find Perfect',
    th: 'ค้นหาที่จอดรถ'
  },
  'parking_spots_hero': {
    en: 'Parking Spots',
    th: 'ที่สมบูรณ์แบบ'
  },
  'hero_description': {
    en: 'Discover and book parking spaces near you, or rent out your own space to earn extra income. Safe, convenient, and affordable parking made simple.',
    th: 'ค้นหาและจองที่จอดรถใกล้คุณ หรือให้เช่าพื้นที่ของคุณเพื่อสร้างรายได้เสริม ที่จอดรถที่ปลอดภัย สะดวก และราคาไม่แพง'
  },
  'landing_find_parking': {
    en: 'Find Parking',
    th: 'ค้นหาที่จอดรถ'
  },
  'list_your_space': {
    en: 'List Your Space',
    th: 'ลงประกาศพื้นที่ของคุณ'
  },
  'why_choose_parkpass': {
    en: 'Why Choose ParkPass?',
    th: 'ทำไมต้องเลือก ParkPass?'
  },
  'easiest_way_to_park': {
    en: 'The easiest way to park and earn',
    th: 'วิธีที่ง่ายที่สุดในการจอดรถและสร้างรายได้'
  },
  'easy_location': {
    en: 'Easy Location',
    th: 'ค้นหาสถานที่ง่าย'
  },
  'easy_location_desc': {
    en: 'Find parking spots near your destination with our smart search',
    th: 'ค้นหาที่จอดรถใกล้จุดหมายของคุณด้วยระบบค้นหาอัจฉริยะ'
  },
  'instant_booking': {
    en: 'Instant Booking',
    th: 'จองทันที'
  },
  'instant_booking_desc': {
    en: 'Book your parking spot in seconds with our quick booking system',
    th: 'จองที่จอดรถของคุณภายในไม่กี่วินาทีด้วยระบบจองด่วน'
  },
  'secure_safe': {
    en: 'Secure & Safe',
    th: 'ปลอดภัยและมั่นคง'
  },
  'secure_safe_desc': {
    en: 'All transactions are secure and parking spots are verified',
    th: 'ทุกการทำธุรกรรมปลอดภัยและที่จอดรถผ่านการตรวจสอบแล้ว'
  },
  'top_rated': {
    en: 'Top Rated',
    th: 'คะแนนสูงสุด'
  },
  'top_rated_desc': {
    en: 'Join thousands of satisfied users who trust ParkPass',
    th: 'เข้าร่วมกับผู้ใช้หลายพันคนที่พอใจและไว้วางใจ ParkPass'
  },
  'ready_to_get_started': {
    en: 'Ready to Get Started?',
    th: 'พร้อมเริ่มต้นแล้วหรือยัง?'
  },
  'join_parkpass_today': {
    en: 'Join ParkPass today and experience hassle-free parking',
    th: 'เข้าร่วม ParkPass วันนี้และสัมผัสประสบการณ์จอดรถที่ไร้ความยุ่งยาก'
  },
  'get_started_now': {
    en: 'Get Started Now',
    th: 'เริ่มต้นตอนนี้'
  },
  'making_parking_simple': {
    en: '© 2025 ParkPass. Making parking simple and profitable.',
    th: '© 2025 ParkPass ทำให้การจอดรถง่ายและมีกำไร'
  },

  // Search & Filters
  'search_by_location_or_address': {
    en: 'Search by location or address...',
    th: 'ค้นหาตามสถานที่หรือที่อยู่...'
  },
  'find_near_me': {
    en: 'Find Near Me',
    th: 'ค้นหาใกล้ฉัน'
  },
  'locating': {
    en: 'Locating...',
    th: 'กำลังค้นหาตำแหน่ง...'
  },
  'filters': {
    en: 'Filters',
    th: 'ตัวกรอง'
  },
  'price_range_per_hour': {
    en: 'Price Range (per hour)',
    th: 'ช่วงราคา (ต่อชั่วโมง)'
  },
  'parking_type': {
    en: 'Parking Type',
    th: 'ประเภทที่จอดรถ'
  },
  'all_types': {
    en: 'All Types',
    th: 'ทุกประเภท'
  },
  'sort_by': {
    en: 'Sort By',
    th: 'เรียงตาม'
  },
  'default': {
    en: 'Default',
    th: 'ค่าเริ่มต้น'
  },
  'price_low_to_high': {
    en: 'Price: Low to High',
    th: 'ราคา: ต่ำไปสูง'
  },
  'price_high_to_low': {
    en: 'Price: High to Low',
    th: 'ราคา: สูงไปต่ำ'
  },
  'name_a_to_z': {
    en: 'Name: A to Z',
    th: 'ชื่อ: ก ถึง ฮ'
  },
  'distance_nearest': {
    en: 'Distance: Nearest',
    th: 'ระยะทาง: ใกล้ที่สุด'
  },
  'available_now_only': {
    en: 'Available now only',
    th: 'ว่างในขณะนี้เท่านั้น'
  },
  'clear_filters': {
    en: 'Clear Filters',
    th: 'ล้างตัวกรอง'
  },
  'min': {
    en: 'Min',
    th: 'ต่ำสุด'
  },
  'max': {
    en: 'Max',
    th: 'สูงสุด'
  },
  'price_range': {
    en: 'Price Range',
    th: 'ช่วงราคา'
  },
  'per_day': {
    en: 'per day',
    th: 'ต่อวัน'
  },
  'per_month': {
    en: 'per month',
    th: 'ต่อเดือน'
  },

  // Profile Page
  'my_profile': {
    en: 'My Profile',
    th: 'โปรไฟล์ของฉัน'
  },
  'personal_info': {
    en: 'Personal Info',
    th: 'ข้อมูลส่วนตัว'
  },
  'vehicles': {
    en: 'Vehicles',
    th: 'ยานพาหนะ'
  },
  'receipts': {
    en: 'Receipts',
    th: 'ใบเสร็จ'
  },
  'settings': {
    en: 'Settings',
    th: 'การตั้งค่า'
  },
  'member_since': {
    en: 'Member Since',
    th: 'สมาชิกตั้งแต่'
  },
  'my_vehicles': {
    en: 'My Vehicles',
    th: 'ยานพาหนะของฉัน'
  },
  'add_vehicle': {
    en: 'Add Vehicle',
    th: 'เพิ่มยานพาหนะ'
  },
  'vehicle_make': {
    en: 'Make',
    th: 'ยี่ห้อ'
  },
  'vehicle_model': {
    en: 'Model',
    th: 'รุ่น'
  },
  'license_plate': {
    en: 'License Plate',
    th: 'ป้ายทะเบียน'
  },
  'color': {
    en: 'Color',
    th: 'สี'
  },
  'edit_vehicle': {
    en: 'Edit Vehicle',
    th: 'แก้ไขยานพาหนะ'
  },
  'delete_vehicle': {
    en: 'Delete Vehicle',
    th: 'ลบยานพาหนะ'
  },
  'no_vehicles_added': {
    en: 'No vehicles added yet',
    th: 'ยังไม่มียานพาหนะที่เพิ่ม'
  },
  'add_first_vehicle': {
    en: 'Add your first vehicle to make booking easier',
    th: 'เพิ่มยานพาหนะแรกของคุณเพื่อให้การจองง่ายขึ้น'
  },
  'booking_history': {
    en: 'Booking History',
    th: 'ประวัติการจอง'
  },
  'no_bookings_yet': {
    en: 'No bookings yet',
    th: 'ยังไม่มีการจอง'
  },
  'start_booking': {
    en: 'Book your first parking spot to see your history here',
    th: 'จองที่จอดรถครั้งแรกของคุณเพื่อดูประวัติที่นี่'
  },
  'find_parking_spots': {
    en: 'Find Parking Spots',
    th: 'ค้นหาที่จอดรถ'
  },
  'notifications_preferences': {
    en: 'Notification Preferences',
    th: 'ตั้งค่าการแจ้งเตือน'
  },
  'booking_reminders': {
    en: 'Booking Reminders',
    th: 'การแจ้งเตือนการจอง'
  },
  'promotional_emails': {
    en: 'Promotional Emails',
    th: 'อีเมลโปรโมชั่น'
  },
  'security_alerts': {
    en: 'Security Alerts',
    th: 'การแจ้งเตือนความปลอดภัย'
  },
  'privacy_security': {
    en: 'Privacy & Security',
    th: 'ความเป็นส่วนตัวและความปลอดภัย'
  },
  'profile_change_password': {
    en: 'Change Password',
    th: 'เปลี่ยนรหัสผ่าน'
  },
  'two_factor_auth': {
    en: 'Two-Factor Authentication',
    th: 'การตรวจสอบสองขั้นตอน'
  },
  'delete_account': {
    en: 'Delete Account',
    th: 'ลบบัญชี'
  },
  'sign_out': {
    en: 'Sign Out',
    th: 'ออกจากระบบ'
  },
  'vehicle_added_success': {
    en: 'Vehicle added successfully',
    th: 'เพิ่มยานพาหนะสำเร็จ'
  },
  'vehicle_updated_success': {
    en: 'Vehicle updated successfully',
    th: 'อัปเดตยานพาหนะสำเร็จ'
  },
  'vehicle_deleted_success': {
    en: 'Vehicle deleted successfully',
    th: 'ลบยานพาหนะสำเร็จ'
  },
  'confirm_delete_vehicle': {
    en: 'Are you sure you want to delete this vehicle?',
    th: 'คุณแน่ใจหรือไม่ว่าต้องการลบยานพาหนะนี้?'
  },

  // Common
  'loading': {
    en: 'Loading...',
    th: 'กำลังโหลด...'
  },
  'save': {
    en: 'Save',
    th: 'บันทึก'
  },
  'cancel': {
    en: 'Cancel',
    th: 'ยกเลิก'
  },
  'delete': {
    en: 'Delete',
    th: 'ลบ'
  },
  'edit': {
    en: 'Edit',
    th: 'แก้ไข'
  },
  'add': {
    en: 'Add',
    th: 'เพิ่ม'
  },
  'search': {
    en: 'Search',
    th: 'ค้นหา'
  },
  'close': {
    en: 'Close',
    th: 'ปิด'
  },
  'back': {
    en: 'Back',
    th: 'กลับ'
  },
  'next': {
    en: 'Next',
    th: 'ถัดไป'
  },
  'previous': {
    en: 'Previous',
    th: 'ก่อนหน้า'
  },
  'submit': {
    en: 'Submit',
    th: 'ส่ง'
  },
  'confirm': {
    en: 'Confirm',
    th: 'ยืนยัน'
  },
  'view': {
    en: 'View',
    th: 'ดู'
  },
  'update': {
    en: 'Update',
    th: 'อัปเดต'
  },
  'refresh': {
    en: 'Refresh',
    th: 'รีเฟรช'
  },
  'language': {
    en: 'Language',
    th: 'ภาษา'
  },

  // Navigation
  'home': {
    en: 'Home',
    th: 'หน้าแรก'
  },
  'bookings': {
    en: 'Bookings',
    th: 'การจอง'
  },
  'profile': {
    en: 'Profile',
    th: 'โปรไฟล์'
  },
  'dashboard': {
    en: 'Dashboard',
    th: 'แดชบอร์ด'
  },
  'back_to_dashboard': {
    en: 'Back to Dashboard',
    th: 'กลับไปยังแดชบอร์ด'
  },
  'logout': {
    en: 'Logout',
    th: 'ออกจากระบบ'
  },
  'notifications': {
    en: 'Notifications',
    th: 'การแจ้งเตือน'
  },

  // Home Page
  // Home Page
  'find_perfect_parking_spot': {
    en: 'Find Your Perfect Parking Spot',
    th: 'ค้นหาที่จอดรถที่สมบูรณ์แบบของคุณ'
  },
  'book_private_parking': {
    en: 'Book private parking spaces from local hosts in your area',
    th: 'จองที่จอดรถส่วนตัวจากเจ้าของในพื้นที่ของคุณ'
  },
  'parking_spots_near_you': {
    en: 'Parking Spots Near You',
    th: 'ที่จอดรถใกล้คุณ'
  },
  'hide_map': {
    en: 'Hide Map',
    th: 'ซ่อนแผนที่'
  },
  'show_map': {
    en: 'Show Map',
    th: 'แสดงแผนที่'
  },
  'available_parking_spots': {
    en: 'Available Parking Spots',
    th: 'ที่จอดรถที่พร้อมใช้งาน'
  },
  'spots_found': {
    en: 'spots found',
    th: 'จุดพบ'
  },
  'spot_found': {
    en: 'spot found',
    th: 'จุดพบ'
  },
  'of_total_spots_available': {
    en: 'of',
    th: 'จาก'
  },
  'spots_available': {
    en: 'spots available',
    th: 'ช่องว่าง'
  },
  'view_details': {
    en: 'View Details',
    th: 'ดูรายละเอียด'
  },
  'no_parking_spots_found': {
    en: 'No parking spots found matching your criteria.',
    th: 'ไม่พบที่จอดรถที่ตรงตามเงื่อนไขของคุณ'
  },
  'try_different_search': {
    en: 'Try adjusting your search or filters.',
    th: 'ลองปรับการค้นหาหรือตัวกรองของคุณ'
  },
  'have_parking_space_to_rent': {
    en: 'Have a parking space to rent?',
    th: 'มีที่จอดรถให้เช่าหรือไม่?'
  },
  'start_earning_money': {
    en: 'Start earning money by sharing your unused parking space with others.',
    th: 'เริ่มสร้างรายได้ด้วยการแบ่งปันที่จอดรถที่ไม่ได้ใช้ของคุณกับผู้อื่น'
  },
  'try_adjusting_search_criteria': {
    en: 'Try adjusting your search criteria or check back later for new listings.',
    th: 'ลองปรับเงื่อนไขการค้นหาของคุณ หรือกลับมาดูใหม่ภายหลังสำหรับรายการใหม่'
  },
  'location_error_message': {
    en: 'Unable to get your location. Please enable location services and try again.',
    th: 'ไม่สามารถขอตำแหน่งของคุณได้ กรุณาเปิดบริการตำแหน่งและลองใหม่อีกครั้ง'
  },
  'geolocation_not_supported': {
    en: 'Geolocation is not supported by this browser',
    th: 'เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง'
  },
  'find_parking_now': {
    en: 'Find Parking Now',
    th: 'หาที่จอดรถตอนนี้'
  },
  'where_do_you_want_to_park': {
    en: 'Where do you want to park?',
    th: 'คุณต้องการจอดรถที่ไหน?'
  },
  'search_location': {
    en: 'Search for a location...',
    th: 'ค้นหาสถานที่...'
  },
  'current_location': {
    en: 'Use Current Location',
    th: 'ใช้ตำแหน่งปัจจุบัน'
  },
  'nearby_parking': {
    en: 'Nearby Parking',
    th: 'ที่จอดรถใกล้เคียง'
  },
  'all_parking_spots': {
    en: 'All Parking Spots',
    th: 'ที่จอดรถทั้งหมด'
  },
  'available_now': {
    en: 'Available Now',
    th: 'ว่างตอนนี้'
  },
  'available_2hrs': {
    en: 'Available within 2 hours',
    th: 'ว่างภายใน 2 ชั่วโมง'
  },
  'full': {
    en: 'Full',
    th: 'เต็ม'
  },
  'per_hour': {
    en: 'per hour',
    th: 'ต่อชั่วโมง'
  },
  'distance': {
    en: 'distance',
    th: 'ระยะทาง'
  },
  'away': {
    en: 'away',
    th: 'ห่าง'
  },
  'book_now': {
    en: 'Book Now',
    th: 'จองเลย'
  },

  // Parking Spot Detail
  'parking_spot_details': {
    en: 'Parking Spot Details',
    th: 'รายละเอียดที่จอดรถ'
  },
  'amenities': {
    en: 'Amenities',
    th: 'สิ่งอำนวยความสะดวก'
  },
  'operating_hours': {
    en: 'Operating Hours',
    th: 'เวลาเปิด-ปิด'
  },
  'location': {
    en: 'Location',
    th: 'ที่ตั้ง'
  },
  'total_slots': {
    en: 'Total Slots',
    th: 'จำนวนช่องทั้งหมด'
  },
  'slots': {
    en: 'slots',
    th: 'ช่อง'
  },
  'reviews': {
    en: 'Reviews',
    th: 'รีวิว'
  },
  'write_review': {
    en: 'Write a Review',
    th: 'เขียนรีวิว'
  },
  'rating': {
    en: 'Rating',
    th: 'คะแนน'
  },
  'show_on_map': {
    en: 'Show on Map',
    th: 'แสดงบนแผนที่'
  },

  // Booking
  'booking_details': {
    en: 'Booking Details',
    th: 'รายละเอียดการจอง'
  },
  'select_date_time': {
    en: 'Select Date & Time',
    th: 'เลือกวันที่และเวลา'
  },
  'start_time': {
    en: 'Start Time',
    th: 'เวลาเริ่มต้น'
  },
  'end_time': {
    en: 'End Time',
    th: 'เวลาสิ้นสุด'
  },
  'duration': {
    en: 'Duration',
    th: 'ระยะเวลา'
  },
  'total_cost': {
    en: 'Total Cost',
    th: 'ค่าใช้จ่ายทั้งหมด'
  },
  'payment_method': {
    en: 'Payment Method',
    th: 'วิธีการชำระเงิน'
  },
  'confirm_booking': {
    en: 'Confirm Booking',
    th: 'ยืนยันการจอง'
  },
  'booking_confirmed': {
    en: 'Booking Confirmed',
    th: 'ยืนยันการจองแล้ว'
  },
  'booking_cancelled': {
    en: 'Booking Cancelled',
    th: 'ยกเลิกการจองแล้ว'
  },
  'hours': {
    en: 'hours',
    th: 'ชั่วโมง'
  },
  'return_to_home': {
    en: 'Return to Home',
    th: 'กลับสู่หน้าหลัก'
  },
  'spot_not_found_message': {
    en: 'We couldn\'t find the parking spot you\'re looking for. It may have been removed or the ID is incorrect.',
    th: 'เราไม่พบที่จอดรถที่คุณกำลังมองหา อาจถูกลบออกแล้วหรือ ID ไม่ถูกต้อง'
  },
  'backup_pin_instructions': {
    en: 'Use this PIN if QR code doesn\'t work - specific to this booking and spot',
    th: 'ใช้ PIN นี้หากรหัส QR ใช้งานไม่ได้ - เฉพาะสำหรับการจองและที่จอดนี้'
  },
  'swipe_for_more_slots': {
    en: '← Swipe to see more time slots →',
    th: '← เลื่อนเพื่อดูช่วงเวลาเพิ่มเติม →'
  },
  'closed_for_service': {
    en: 'Closed for Service',
    th: 'ปิดให้บริการ'
  },
  'scan_qr_banking_app': {
    en: 'Scan the QR code below with your banking app',
    th: 'สแกนรหัส QR ด้านล่างด้วยแอปธนาคารของคุณ'
  },
  'qr_not_available': {
    en: 'QR code not available.',
    th: 'รหัส QR ไม่พร้อมใช้งาน'
  },
  'contact_owner': {
    en: 'Please contact the owner.',
    th: 'กรุณาติดต่อเจ้าของ'
  },
  'transfer_exact_amount': {
    en: 'Transfer the exact amount: ฿{amount}',
    th: 'โอนเงินจำนวนที่แน่นอน: ฿{amount}'
  },
  'include_booking_reference': {
    en: 'Make sure to include the booking reference in the payment notes',
    th: 'อย่าลืมใส่หมายเลขการจองในหมายเหตุการโอนเงิน'
  },
  'take_screenshot_confirmation': {
    en: 'Take a screenshot of your payment confirmation',
    th: 'ถ่ายภาพหน้าจอยืนยันการชำระเงินของคุณ'
  },
  'upload_next_step': {
    en: 'You\'ll need to upload this in the next step',
    th: 'คุณจะต้องอัปโหลดในขั้นตอนถัดไป'
  },
  'upload_payment_confirmation': {
    en: 'Please upload your payment confirmation',
    th: 'กรุณาอัปโหลดการยืนยันการชำระเงินของคุณ'
  },
  'upload_payment_instructions': {
    en: 'Take a screenshot of your payment confirmation and upload it here. This will be used to verify your payment.',
    th: 'ถ่ายภาพหน้าจอการยืนยันการชำระเงินและอัปโหลดที่นี่ จะใช้เพื่อตรวจสอบการชำระเงินของคุณ'
  },
  'payment_slip_uploaded_title': {
    en: 'Payment Slip Uploaded',
    th: 'อัปโหลดสลิปการชำระเงินแล้ว'
  },
  'selected_slots': {
    en: 'Selected Slots',
    th: 'ช่วงเวลาที่เลือก'
  },
  'slot': {
    en: 'slot',
    th: 'ช่วง'
  },
  'prorated_pricing_applied': {
    en: 'Prorated pricing applied due to partial time remaining in some slots',
    th: 'มีการปรับราคาตามสัดส่วนเนื่องจากเวลาที่เหลือในบางช่วง'
  },
  'scan_qr_code': {
    en: 'Scan QR Code',
    th: 'สแกนรหัส QR'
  },
  'min_remaining': {
    en: 'min remaining',
    th: 'นาทีที่เหลือ'
  },
  'half_price_extra': {
    en: 'Half price + extra',
    th: 'ครึ่งราคา + ส่วนเพิ่ม'
  },
  'confirm_upload': {
    en: 'Confirm Upload',
    th: 'ยืนยันการอัปโหลด'
  },
  'take_clear_photo_receipt': {
    en: 'Take a clear photo of your payment receipt',
    th: 'ถ่ายภาพใบเสร็จการชำระเงินของคุณให้ชัดเจน'
  },
  'ensure_transaction_details_visible': {
    en: 'Ensure all transaction details are visible',
    th: 'ตรวจสอบให้แน่ใจว่ารายละเอียดการทำธุรกรรมทั้งหมดมองเห็นได้'
  },
  'include_booking_reference_available': {
    en: 'Include the booking reference if available',
    th: 'ใส่หมายเลขอ้างอิงการจองหากมี'
  },
  'booking_confirmed_after_verification': {
    en: 'Your booking will be confirmed after verification',
    th: 'การจองของคุณจะได้รับการยืนยันหลังจากการตรวจสอบ'
  },
  'selected_time_slots': {
    en: 'Selected Time Slots',
    th: 'ช่วงเวลาที่เลือก'
  },
  'minutes': {
    en: 'minutes',
    th: 'นาที'
  },
  'invalid_slot_data': {
    en: 'Invalid slot data',
    th: 'ข้อมูลช่องจอดไม่ถูกต้อง'
  },
  'past_time_slot': {
    en: 'Past',
    th: 'เลยเวลาแล้ว'
  },
  'too_late': {
    en: 'Too late',
    th: 'สายเกินไป'
  },
  'less_than_30_min': {
    en: '<30 min until end',
    th: '<30 นาทีก่อนสิ้นสุด'
  },
  'booked_slots': {
    en: 'booked',
    th: 'จองแล้ว'
  },
  'error_loading_slot': {
    en: 'Error loading slot',
    th: 'เกิดข้อผิดพลาดในการโหลดช่องจอด'
  },

  // Bookings List
  'my_bookings': {
    en: 'My Bookings',
    th: 'การจองของฉัน'
  },
  'active_bookings': {
    en: 'Active Bookings',
    th: 'การจองที่ใช้งานอยู่'
  },
  'past_bookings': {
    en: 'Past Bookings',
    th: 'การจองที่ผ่านมา'
  },
  'upcoming': {
    en: 'Upcoming',
    th: 'กำลังจะมาถึง'
  },
  'in_progress': {
    en: 'In Progress',
    th: 'กำลังดำเนินการ'
  },
  'completed': {
    en: 'Completed',
    th: 'เสร็จสิ้น'
  },
  'cancelled': {
    en: 'Cancelled',
    th: 'ยกเลิกแล้ว'
  },
  'expired': {
    en: 'Expired',
    th: 'หมดอายุ'
  },
  'booking_expired': {
    en: 'Booking Expired',
    th: 'การจองหมดอายุ'
  },
  'booking_expired_notice': {
    en: 'Past deadline',
    th: 'เลยกำหนดเวลา'
  },
  'booking_expired_message': {
    en: 'This booking has expired as the reserved time has passed. You can book this spot again for future use.',
    th: 'การจองนี้หมดอายุแล้วเนื่องจากเลยเวลาที่จองไว้ คุณสามารถจองสถานที่นี้อีกครั้งสำหรับการใช้งานในอนาคต'
  },
  'verified': {
    en: 'Verified',
    th: 'ยืนยันแล้ว'
  },
  'payment_verification_pending': {
    en: 'Payment Verification Pending',
    th: 'รอการยืนยันการชำระเงิน'
  },
  'payment_slip_uploaded': {
    en: 'Your payment slip has been uploaded and is being processed. The booking will be confirmed once the payment is verified.',
    th: 'สลิปการชำระเงินของคุณถูกอัปโหลดแล้วและกำลังดำเนินการ การจองจะถูกยืนยันเมื่อการชำระเงินได้รับการตรวจสอบแล้ว'
  },
  'entry_qr_code': {
    en: 'Entry QR Code',
    th: 'คิวอาร์โค้ดสำหรับเข้าใช้'
  },
  'show_qr_verification': {
    en: 'Show this QR code at the parking spot for verification. This QR code is specific to your booking and parking spot.',
    th: 'แสดงคิวอาร์โค้ดนี้ที่จุดจอดรถเพื่อยืนยันตัวตน คิวอาร์โค้ดนี้เฉพาะสำหรับการจองและจุดจอดรถของคุณ'
  },
  'payment_being_verified': {
    en: 'Your payment is being verified. This usually takes a few minutes.',
    th: 'การชำระเงินของคุณกำลังถูกตรวจสอบ โดยปกติจะใช้เวลาไม่กี่นาที'
  },
  'click_upload_payment': {
    en: 'Click to upload payment confirmation',
    th: 'คลิกเพื่ออัปโหลดหลักฐานการชำระเงิน'
  },
  'uploading_payment_slip': {
    en: 'Uploading payment slip...',
    th: 'กำลังอัปโหลดสลิปการชำระเงิน...'
  },
  'drag_drop_payment_slip': {
    en: 'Drag and drop your payment slip image here, or click to browse',
    th: 'ลากและวางรูปภาพสลิปการชำระเงินที่นี่ หรือคลิกเพื่อเลือกไฟล์'
  },
  'payment_not_verified': {
    en: 'Payment for this booking has not been verified yet.',
    th: 'การชำระเงินสำหรับการจองนี้ยังไม่ได้รับการตรวจสอบ'
  },
  'qr_pin_verified_completed': {
    en: 'This booking has already been completed. QR/PIN verified - Status: COMPLETED',
    th: 'การจองนี้เสร็จสิ้นแล้ว QR/PIN ยืนยันแล้ว - สถานะ: เสร็จสิ้น'
  },
  'qr_pin_verified_status': {
    en: 'QR/PIN verified. Booking status',
    th: 'QR/PIN ยืนยันแล้ว สถานะการจอง'
  },
  'automatically_verified': {
    en: 'Automatically verified',
    th: 'ยืนยันอัตโนมัติ'
  },
  'manual_verification_needed': {
    en: 'Manual verification needed',
    th: 'ต้องยืนยันด้วยตนเอง'
  },
  'select_parking_time': {
    en: 'Select Parking Time',
    th: 'เลือกเวลาจอดรถ'
  },
  'date': {
    en: 'Date',
    th: 'วันที่'
  },
  'booking_rules': {
    en: 'Booking Rules',
    th: 'กฎการจอง'
  },
  'consecutive_slots_only': {
    en: 'You can only select consecutive time slots',
    th: 'คุณสามารถเลือกช่วงเวลาที่ต่อเนื่องกันเท่านั้น'
  },
  'thirty_min_rule': {
    en: 'Booking is allowed only if more than 30 minutes remain until slot ends',
    th: 'การจองได้เฉพาะเมื่อเหลือเวลามากกว่า 30 นาทีจนถึงสิ้นสุดช่วงเวลา'
  },
  'pricing_rule': {
    en: 'Pricing: Full price if ≥60min remaining, prorated if 30-59min remaining',
    th: 'การคิดราคา: ราคาเต็มหากเหลือเวลา ≥60 นาที หรือคิดตามสัดส่วนหากเหลือ 30-59 นาที'
  },
  'prorated_rule': {
    en: 'Prorated = Half price + proportional extra (minimum 50% of base price)',
    th: 'การคิดตามสัดส่วน = ครึ่งราคา + ส่วนเพิ่มตามสัดส่วน (ขั้นต่ำ 50% ของราคาปกติ)'
  },
  'base_price': {
    en: 'Base price',
    th: 'ราคาปกติ'
  },
  'available': {
    en: 'Available',
    th: 'ว่าง'
  },
  'limited': {
    en: 'Limited',
    th: 'จำกัด'
  },
  'unavailable': {
    en: 'Unavailable',
    th: 'ไม่ว่าง'
  },
  'select_vehicle': {
    en: 'Select Vehicle',
    th: 'เลือกยานพาหนะ'
  },
  'loading_vehicles': {
    en: 'Loading vehicles...',
    th: 'กำลังโหลดข้อมูลยานพาหนะ...'
  },
  'go_to_profile': {
    en: 'Go to Profile',
    th: 'ไปยังโปรไฟล์'
  },
  'position_qr_code': {
    en: 'Position the QR code within the camera view',
    th: 'วางตำแหน่ง QR Code ให้อยู่ในกรอบกล้อง'
  },
  'checking': {
    en: 'Checking...',
    th: 'กำลังตรวจสอบ...'
  },
  'checking_status': {
    en: 'checking...',
    th: 'กำลังตรวจสอบ...'
  },
  'uploading': {
    en: 'Uploading...',
    th: 'กำลังอัปโหลด...'
  },
  'loading_parking_spots': {
    en: 'Loading parking spots...',
    th: 'กำลังโหลดข้อมูลที่จอดรถ...'
  },
  'error_loading_parking_spots': {
    en: 'Error loading parking spots',
    th: 'เกิดข้อผิดพลาดในการโหลดข้อมูลที่จอดรถ'
  },
  'booking_successful': {
    en: 'Booking Successful!',
    th: 'การจองสำเร็จ!'
  },
  'parking_spot_reserved': {
    en: 'Your parking spot has been reserved',
    th: 'ที่จอดรถของคุณได้รับการจองเรียบร้อยแล้ว'
  },
  'verification': {
    en: 'Verification',
    th: 'การยืนยัน'
  },
  'qr_code_not_found': {
    en: 'QR code not found',
    th: 'ไม่พบ QR Code'
  },
  'failed_download_qr': {
    en: 'Failed to download QR code. Please try again.',
    th: 'ไม่สามารถดาวน์โหลด QR Code ได้ กรุณาลองใหม่อีกครั้ง'
  },
  'failed_create_booking': {
    en: 'Failed to create booking. Please try again.',
    th: 'ไม่สามารถสร้างการจองได้ กรุณาลองใหม่อีกครั้ง'
  },
  'payment_step': {
    en: 'Payment',
    th: 'การชำระเงิน'
  },
  'payment_details': {
    en: 'Payment Details',
    th: 'รายละเอียดการชำระเงิน'
  },
  'booking_summary': {
    en: 'Booking Summary',
    th: 'สรุปการจอง'
  },
  'rate': {
    en: 'Rate',
    th: 'อัตรา'
  },
  'time_slots': {
    en: 'Time slots',
    th: 'ช่วงเวลา'
  },
  'proceed_to_payment': {
    en: 'Proceed to Payment',
    th: 'ดำเนินการชำระเงิน'
  },
  'proceed_to_upload_slip': {
    en: 'Proceed to Upload Slip',
    th: 'ดำเนินการอัปโหลดสลิป'
  },
  'complete_booking': {
    en: 'Complete Booking',
    th: 'ยืนยันการจอง'
  },
  'per_hour_unit': {
    en: '/hour',
    th: '/ชั่วโมง'
  },
  'hours_unit': {
    en: 'hours',
    th: 'ชั่วโมง'
  },
  'slots_unit': {
    en: 'slots',
    th: 'ช่วง'
  },
  'no_bookings': {
    en: 'No bookings found',
    th: 'ไม่พบการจอง'
  },
  'cancel_booking': {
    en: 'Cancel Booking',
    th: 'ยกเลิกการจอง'
  },
  'extend_booking': {
    en: 'Extend Booking',
    th: 'ขยายเวลาการจอง'
  },
  'extension_cost': {
    en: 'Extension Cost',
    th: 'ค่าขยายเวลา'
  },
  'extend_parking': {
    en: 'Extend Parking',
    th: 'ขยายเวลาจอด'
  },

  // Profile
  'personal_information': {
    en: 'Personal Information',
    th: 'ข้อมูลส่วนตัว'
  },
  'account_settings': {
    en: 'Account Settings',
    th: 'การตั้งค่าบัญชี'
  },
  'change_password': {
    en: 'Change Password',
    th: 'เปลี่ยนรหัสผ่าน'
  },
  'current_password': {
    en: 'Current Password',
    th: 'รหัสผ่านปัจจุบัน'
  },
  'new_password': {
    en: 'New Password',
    th: 'รหัสผ่านใหม่'
  },
  'confirm_new_password': {
    en: 'Confirm New Password',
    th: 'ยืนยันรหัสผ่านใหม่'
  },
  'update_profile': {
    en: 'Update Profile',
    th: 'อัปเดตโปรไฟล์'
  },
  'profile_updated': {
    en: 'Profile updated successfully',
    th: 'อัปเดตโปรไฟล์สำเร็จ'
  },

  // Owner Dashboard
  'owner_dashboard': {
    en: 'Owner Dashboard',
    th: 'แดชบอร์ดเจ้าของ'
  },
  'my_parking_spots': {
    en: 'My Parking Spots',
    th: 'ที่จอดรถของฉัน'
  },
  'add_parking_spot': {
    en: 'Add Parking Spot',
    th: 'เพิ่มที่จอดรถ'
  },
  'manage_availability': {
    en: 'Manage Availability',
    th: 'จัดการความพร้อมใช้งาน'
  },
  'earnings': {
    en: 'Earnings',
    th: 'รายได้'
  },
  'total_earnings': {
    en: 'Total Earnings',
    th: 'รายได้รวม'
  },
  'this_month': {
    en: 'This Month',
    th: 'เดือนนี้'
  },
  'active_spots': {
    en: 'Active Spots',
    th: 'สถานที่ที่ใช้งานอยู่'
  },
  'total_bookings': {
    en: 'Total Bookings',
    th: 'การจองทั้งหมด'
  },

  // Add/Edit Parking Spot
  'add_new_parking_spot': {
    en: 'Add New Parking Spot',
    th: 'เพิ่มที่จอดรถใหม่'
  },
  'add_first_parking_spot': {
    en: 'Add Your First Spot',
    th: 'เพิ่มที่จอดรถแรกของคุณ'
  },
  'edit_parking_spot': {
    en: 'Edit Parking Spot',
    th: 'แก้ไขที่จอดรถ'
  },
  'spot_name': {
    en: 'Spot Name',
    th: 'ชื่อที่จอดรถ'
  },
  'description': {
    en: 'Description',
    th: 'คำอธิบาย'
  },
  'address': {
    en: 'Address',
    th: 'ที่อยู่'
  },
  'number_of_slots': {
    en: 'Number of Slots',
    th: 'จำนวนช่องจอด'
  },
  'upload_photos': {
    en: 'Upload Photos',
    th: 'อัปโหลดรูปภาพ'
  },
  'select_amenities': {
    en: 'Select Amenities',
    th: 'เลือกสิ่งอำนวยความสะดวก'
  },
  'set_operating_hours': {
    en: 'Set Operating Hours',
    th: 'ตั้งเวลาเปิด-ปิด'
  },
  'monday': {
    en: 'Monday',
    th: 'จันทร์'
  },
  'tuesday': {
    en: 'Tuesday',
    th: 'อังคาร'
  },
  'wednesday': {
    en: 'Wednesday',
    th: 'พุธ'
  },
  'thursday': {
    en: 'Thursday',
    th: 'พฤหัสบดี'
  },
  'friday': {
    en: 'Friday',
    th: 'ศุกร์'
  },
  'saturday': {
    en: 'Saturday',
    th: 'เสาร์'
  },
  'sunday': {
    en: 'Sunday',
    th: 'อาทิตย์'
  },
  'closed': {
    en: 'Closed',
    th: 'ปิด'
  },
  'open_24_hours': {
    en: '24 Hours',
    th: '24 ชั่วโมง'
  },

  // Admin Dashboard
  'admin_dashboard': {
    en: 'Admin Dashboard',
    th: 'แดชบอร์ดแอดมิน'
  },
  'pending_verifications': {
    en: 'Pending Verifications',
    th: 'รออนุมัติ'
  },
  'verify_owners': {
    en: 'Verify Owners',
    th: 'ยืนยันเจ้าของ'
  },
  'verification_center': {
    en: 'Verification Center',
    th: 'ศูนย์ยืนยัน'
  },
  'pending_owner_approval': {
    en: 'Pending Owner Approval',
    th: 'รออนุมัติเจ้าของ'
  },
  'no_pending_owners': {
    en: 'No pending owners.',
    th: 'ไม่มีเจ้าของที่รออนุมัติ'
  },
  'pending_parking_spot_approval': {
    en: 'Pending Parking Spot Approval',
    th: 'รออนุมัติที่จอดรถ'
  },
  'no_pending_parking_spots': {
    en: 'No pending parking spots.',
    th: 'ไม่มีที่จอดรถที่รออนุมัติ'
  },
  'owner_document': {
    en: 'Owner Document',
    th: 'เอกสารเจ้าของ'
  },
  'no_document_uploaded': {
    en: 'No document uploaded.',
    th: 'ไม่มีเอกสารที่อัปโหลด'
  },
  'click_to_enlarge': {
    en: 'Click to enlarge',
    th: 'คลิกเพื่อขยาย'
  },
  'no_images': {
    en: 'No images',
    th: 'ไม่มีรูปภาพ'
  },
  'system_stats': {
    en: 'System Statistics',
    th: 'สถิติระบบ'
  },
  'total_users': {
    en: 'Total Users',
    th: 'ผู้ใช้ทั้งหมด'
  },
  'total_owners': {
    en: 'Total Owners',
    th: 'เจ้าของทั้งหมด'
  },
  'total_spots': {
    en: 'Total Spots',
    th: 'ที่จอดรถทั้งหมด'
  },
  'approve': {
    en: 'Approve',
    th: 'อนุมัติ'
  },
  'reject': {
    en: 'Reject',
    th: 'ปฏิเสธ'
  },
  'pending': {
    en: 'Pending',
    th: 'รอดำเนินการ'
  },
  'approved': {
    en: 'Approved',
    th: 'อนุมัติแล้ว'
  },
  'rejected': {
    en: 'Rejected',
    th: 'ปฏิเสธแล้ว'
  },

  // Availability Management
  'control_when_parking_spots_available': {
    en: 'Control when your parking spots are available',
    th: 'ควบคุมเวลาที่ที่จอดรถของคุณพร้อมใช้งาน'
  },
  'occupancy_rate': {
    en: 'Occupancy Rate',
    th: 'อัตราการใช้งาน'
  },
  'select_date': {
    en: 'Select Date',
    th: 'เลือกวันที่'
  },
  'select_hour': {
    en: 'Select Hour',
    th: 'เลือกชั่วโมง'
  },
  'maintenance': {
    en: 'Maintenance',
    th: 'ปรับปรุง'
  },
  'blocked': {
    en: 'Blocked',
    th: 'บล็อก'
  },
  'block_time': {
    en: 'Block Time',
    th: 'บล็อกเวลา'
  },
  'time_blocks_for': {
    en: 'Time Blocks for',
    th: 'บล็อกเวลาสำหรับ'
  },
  'no_time_blocks_set': {
    en: 'No time blocks set for this date',
    th: 'ไม่มีการบล็อกเวลาสำหรับวันที่นี้'
  },
  'all_slots_available_operating_hours': {
    en: 'All slots are available during operating hours',
    th: 'ที่จอดทั้งหมดพร้อมใช้งานในเวลาเปิดบริการ'
  },
  'all_upcoming_time_blocks': {
    en: 'All Upcoming Time Blocks',
    th: 'บล็อกเวลาที่จะมาถึงทั้งหมด'
  },
  'no_time_blocks_configured': {
    en: 'No time blocks configured yet',
    th: 'ยังไม่มีการตั้งค่าบล็อกเวลา'
  },
  'block_time_slot': {
    en: 'Block Time Slot',
    th: 'บล็อกช่วงเวลา'
  },
  'slots_affected': {
    en: 'Slots Affected',
    th: 'จำนวนที่จอดที่ได้รับผลกระทบ'
  },
  'reason_optional': {
    en: 'Reason (Optional)',
    th: 'เหตุผล (ไม่บังคับ)'
  },
  'example_reason_placeholder': {
    en: 'e.g., Maintenance, Private event, etc.',
    th: 'เช่น การบำรุงรักษา งานส่วนตัว ฯลฯ'
  },
  'add_block': {
    en: 'Add Block',
    th: 'เพิ่มบล็อก'
  },
  'slots_affected_lowercase': {
    en: 'slots affected',
    th: 'ที่จอดที่ได้รับผลกระทบ'
  },
  'reason': {
    en: 'Reason',
    th: 'เหตุผล'
  },
  'all_day': {
    en: 'All Day',
    th: 'ตลอดวัน'
  },
  'total_blocked_slots_exceed_available': {
    en: 'Total blocked slots cannot exceed available parking slots',
    th: 'จำนวนช่องจอดที่บล็อกไม่สามารถเกินช่องจอดที่มีทั้งหมด'
  },

  // Existing Login Page translations
  'welcome_back': {
    en: 'Welcome back to the future of parking',
    th: 'ยินดีต้อนรับสู่อนาคตของการจอดรถ'
  },
  'find_parking': {
    en: 'Find and book parking spots instantly',
    th: 'ค้นหาและจองที่จอดรถได้ทันที'
  },
  'start_earning': {
    en: 'Start earning from your parking spaces',
    th: 'เริ่มหารายได้จากที่จอดรถของคุณ'
  },
  'sign_in': {
    en: 'Sign In',
    th: 'เข้าสู่ระบบ'
  },
  'create_driver_account': {
    en: 'Create Driver Account',
    th: 'สร้างบัญชีผู้ขับขี่'
  },
  'create_owner_account': {
    en: 'Create Owner Account',
    th: 'สร้างบัญชีเจ้าของ'
  },
  'enter_credentials': {
    en: 'Enter your credentials to access your account',
    th: 'กรอกข้อมูลเพื่อเข้าสู่บัญชีของคุณ'
  },
  'join_drivers': {
    en: 'Join thousands of drivers finding perfect parking',
    th: 'เข้าร่วมกับผู้ขับขี่หลายพันคนในการหาที่จอดรถที่สมบูรณ์แบบ'
  },
  'monetize_spaces': {
    en: 'Start monetizing your parking spaces today',
    th: 'เริ่มสร้างรายได้จากที่จอดรถของคุณวันนี้'
  },
  'driver': {
    en: 'Driver',
    th: 'ผู้ขับขี่'
  },
  'owner': {
    en: 'Owner',
    th: 'เจ้าของ'
  },
  'find_book_parking': {
    en: 'Find & book parking',
    th: 'หาและจองที่จอดรถ'
  },
  'list_spaces': {
    en: 'List your spaces',
    th: 'ลงทะเบียนพื้นที่ของคุณ'
  },
  'full_name': {
    en: 'Full Name',
    th: 'ชื่อ-นามสกุล'
  },
  'enter_full_name': {
    en: 'Enter your full name',
    th: 'กรอกชื่อ-นามสกุลของคุณ'
  },
  'business_name': {
    en: 'Business Name',
    th: 'ชื่อธุรกิจ'
  },
  'business_name_placeholder': {
    en: 'Your business or property name',
    th: 'ชื่อธุรกิจหรือชื่อที่ดินของคุณ'
  },
  'email_address': {
    en: 'Email Address',
    th: 'ที่อยู่อีเมล'
  },
  'enter_email': {
    en: 'Enter your email',
    th: 'กรอกอีเมลของคุณ'
  },
  'phone_number': {
    en: 'Phone Number',
    th: 'หมายเลขโทรศัพท์'
  },
  'enter_phone': {
    en: 'Enter your phone number',
    th: 'กรอกหมายเลขโทรศัพท์ของคุณ'
  },
  'business_address': {
    en: 'Business Address',
    th: 'ที่อยู่ธุรกิจ'
  },
  'primary_location': {
    en: 'Primary business location',
    th: 'ที่ตั้งธุรกิจหลัก'
  },
  'upload_proof': {
    en: 'Upload Proof of Ownership',
    th: 'อัปโหลดหลักฐานความเป็นเจ้าของ'
  },
  'id_document': {
    en: '(ID card or government document)',
    th: '(บัตรประชาชนหรือเอกสารราชการ)'
  },
  'choose_file': {
    en: 'Choose file',
    th: 'เลือกไฟล์'
  },
  'upload_clear_document': {
    en: 'Please upload a clear image or PDF of your ownership document. This is required for verification.',
    th: 'กรุณาอัปโหลดภาพที่ชัดเจนหรือ PDF ของเอกสารยืนยันความเป็นเจ้าของ จำเป็นสำหรับการตรวจสอบ'
  },
  'password': {
    en: 'Password',
    th: 'รหัสผ่าน'
  },
  'enter_password': {
    en: 'Enter your password',
    th: 'กรอกรหัสผ่านของคุณ'
  },
  'password_requirements': {
    en: 'Must be at least 8 characters with letters and numbers',
    th: 'ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข'
  },
  'confirm_password': {
    en: 'Confirm Password',
    th: 'ยืนยันรหัสผ่าน'
  },
  'confirm_password_placeholder': {
    en: 'Confirm your password',
    th: 'ยืนยันรหัสผ่านของคุณ'
  },
  'remember_me': {
    en: 'Remember me',
    th: 'จดจำฉัน'
  },
  'forgot_password': {
    en: 'Forgot password?',
    th: 'ลืมรหัสผ่าน?'
  },
  'agree_terms': {
    en: 'I agree to the',
    th: 'ฉันยอมรับ'
  },
  'terms_of_service': {
    en: 'Terms of Service',
    th: 'เงื่อนไขการใช้งาน'
  },
  'and': {
    en: 'and',
    th: 'และ'
  },
  'privacy_policy': {
    en: 'Privacy Policy',
    th: 'นโยบายความเป็นส่วนตัว'
  },
  'please_wait': {
    en: 'Please wait...',
    th: 'กรุณารอสักครู่...'
  },
  'no_account': {
    en: "Don't have an account?",
    th: 'ยังไม่มีบัญชี?'
  },
  'sign_up_driver': {
    en: 'Sign up as a driver',
    th: 'สมัครเป็นผู้ขับขี่'
  },
  'or': {
    en: 'or',
    th: 'หรือ'
  },
  'list_parking_space': {
    en: 'list your parking space',
    th: 'ลงทะเบียนที่จอดรถของคุณ'
  },
  'have_account': {
    en: 'Already have an account?',
    th: 'มีบัญชีแล้ว?'
  },
  // Email Confirmation
  'registration_submitted': {
    en: 'Registration Submitted',
    th: 'ส่งใบสมัครแล้ว'
  },
  'check_email': {
    en: 'Check Your Email',
    th: 'ตรวจสอบอีเมลของคุณ'
  },
  'owner_registration_message': {
    en: 'Thank you for registering as a parking space owner.',
    th: 'ขอบคุณที่ลงทะเบียนเป็นเจ้าของที่จอดรถ'
  },
  'registration_pending': {
    en: 'Your registration has been received and is pending admin approval.',
    th: 'ใบสมัครของคุณได้รับแล้ว กำลังรอการอนุมัติจากแอดมิน'
  },
  'what_happens_next': {
    en: 'What happens next?',
    th: 'จะเกิดอะไรขึ้นต่อไป?'
  },
  'admin_review': {
    en: 'An admin will review your documents.',
    th: 'แอดมินจะตรวจสอบเอกสารของคุณ'
  },
  'approval_email': {
    en: 'Once approved, you will receive a confirmation email at',
    th: 'เมื่ออนุมัติแล้ว คุณจะได้รับอีเมลยืนยันที่'
  },
  'rejection_email': {
    en: 'If rejected, you will also be notified by email.',
    th: 'หากถูกปฏิเสธ คุณจะได้รับแจ้งทางอีเมลเช่นกัน'
  },
  'verification_time': {
    en: 'Please allow up to 1-3 business days for verification.',
    th: 'กรุณารอ 1-3 วันทำการสำหรับการตรวจสอบ'
  },
  'back_to_login': {
    en: 'Back to Login',
    th: 'กลับสู่หน้าเข้าสู่ระบบ'
  },
  'confirmation_sent': {
    en: "We've sent a confirmation link to",
    th: 'เราได้ส่งลิงก์ยืนยันไปยัง'
  },
  'complete_registration': {
    en: 'Please click the link in your email to complete your registration.',
    th: 'กรุณาคลิกลิงก์ในอีเมลเพื่อเสร็จสิ้นการลงทะเบียน'
  },
  'dont_see_email': {
    en: "Don't see the email?",
    th: 'ไม่เห็นอีเมล?'
  },
  'check_spam': {
    en: 'Check your spam or junk folder',
    th: 'ตรวจสอบโฟลเดอร์สแปมหรือจังเมล'
  },
  'correct_email': {
    en: 'Make sure you entered the correct email address',
    th: 'ตรวจสอบให้แน่ใจว่าใส่อีเมลถูกต้อง'
  },
  'wait_minutes': {
    en: 'Wait a few minutes for the email to arrive',
    th: 'รอสักครู่เพื่อให้อีเมลมาถึง'
  },
  'sending': {
    en: 'Sending...',
    th: 'กำลังส่ง...'
  },
  'resend_confirmation': {
    en: 'Resend Confirmation Email',
    th: 'ส่งอีเมลยืนยันอีกครั้ง'
  },
  'back_to_registration': {
    en: 'Back to Registration',
    th: 'กลับไปหน้าลงทะเบียน'
  },
  'upload_document_error': {
    en: 'Please upload owner verification document',
    th: 'กรุณาอัปโหลดหลักฐานเจ้าของที่'
  },
  'no_notifications': {
    en: 'No notifications',
    th: 'ไม่มีการแจ้งเตือน'
  },
  'mark_all_read': {
    en: 'Mark all as read',
    th: 'ทำเครื่องหมายอ่านทั้งหมด'
  },

  // Bookings Page
  'copied_to_clipboard': {
    en: 'copied to clipboard!',
    th: 'คัดลอกไปยังคลิปบอร์ดแล้ว!'
  },
  'booking_extended_success': {
    en: 'Booking extended successfully!',
    th: 'ขยายเวลาการจองสำเร็จ!'
  },
  'confirm_cancel_booking': {
    en: 'Are you sure you want to cancel this booking?',
    th: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้?'
  },
  'booking_cancelled_success': {
    en: 'Booking cancelled successfully!',
    th: 'ยกเลิกการจองสำเร็จ!'
  },
  'failed_to_cancel_booking': {
    en: 'Failed to cancel booking',
    th: 'การยกเลิกการจองล้มเหลว'
  },
  'current_bookings': {
    en: 'Current Bookings',
    th: 'การจองปัจจุบัน'
  },
  'show_qr_code': {
    en: 'Show QR Code',
    th: 'แสดงคิวอาร์โค้ด'
  },
  'leave_review': {
    en: 'Leave Review',
    th: 'เขียนรีวิว'
  },
  'view_receipt': {
    en: 'View Receipt',
    th: 'ดูใบเสร็จ'
  },
  'get_directions': {
    en: 'Get Directions',
    th: 'เส้นทาง'
  },
  'booking_id': {
    en: 'Booking ID',
    th: 'รหัสการจอง'
  },
  'parking_time': {
    en: 'Parking Time',
    th: 'เวลาจอดรถ'
  },
  'payment_status': {
    en: 'Payment Status',
    th: 'สถานะการชำระเงิน'
  },
  'payment_slip': {
    en: 'Payment Slip',
    th: 'สลิปการชำระเงิน'
  },
  'upload_payment_slip': {
    en: 'Upload Payment Slip',
    th: 'อัปโหลดสลิปการชำระเงิน'
  },
  'extend_by_hours': {
    en: 'Extend by hours',
    th: 'ขยายเวลา (ชั่วโมง)'
  },
  'additional_cost': {
    en: 'Additional cost',
    th: 'ค่าใช้จ่ายเพิ่มเติม'
  },
  'no_current_bookings': {
    en: 'No current bookings',
    th: 'ไม่มีการจองปัจจุบัน'
  },
  'no_booking_history': {
    en: 'No booking history',
    th: 'ไม่มีประวัติการจอง'
  },
  'book_first_parking_spot': {
    en: 'Book your first parking spot to see it here',
    th: 'จองที่จอดรถครั้งแรกของคุณเพื่อดูที่นี่'
  },
  'completed_cancelled_bookings': {
    en: 'Your completed and cancelled bookings will appear here',
    th: 'การจองที่เสร็จสิ้นและยกเลิกจะปรากฏที่นี่'
  },

  // Additional Bookings Page translations
  'booking_not_found': {
    en: 'Booking not found',
    th: 'ไม่พบการจอง'
  },
  'thank_you_review': {
    en: 'Thank you for your',
    th: 'ขอบคุณสำหรับ'
  },
  'star_review': {
    en: 'star review',
    th: 'ดาวรีวิว'
  },
  'failed_submit_review': {
    en: 'Failed to submit review',
    th: 'การส่งรีวิวล้มเหลว'
  },
  'location_not_available': {
    en: 'Location information not available for this parking spot',
    th: 'ไม่มีข้อมูลตำแหน่งสำหรับที่จอดรถนี้'
  },
  'qr_code_not_available': {
    en: 'QR code not available',
    th: 'ไม่มีคิวอาร์โค้ด'
  },
  'unable_generate_qr': {
    en: 'Unable to generate QR code image',
    th: 'ไม่สามารถสร้างภาพคิวอาร์โค้ดได้'
  },
  'unknown_spot': {
    en: 'Unknown Spot',
    th: 'ไม่ทราบที่จอด'
  },
  'no_address': {
    en: 'No address',
    th: 'ไม่มีที่อยู่'
  },
  'entry_access': {
    en: 'Entry Access',
    th: 'การเข้าถึง'
  },
  'pin_code': {
    en: 'PIN Code',
    th: 'รหัส PIN'
  },
  'copy_pin': {
    en: 'Copy PIN',
    th: 'คัดลอก PIN'
  },
  'book_again': {
    en: 'Book Again',
    th: 'จองอีกครั้ง'
  },
  'rate_and_review': {
    en: 'Rate & Review',
    th: 'ให้คะแนนและรีวิว'
  },
  'error_loading_bookings': {
    en: 'Error Loading Bookings',
    th: 'เกิดข้อผิดพลาดในการโหลดการจอง'
  },
  'try_again': {
    en: 'Try Again',
    th: 'ลองใหม่อีกครั้ง'
  },
  'manage_parking_reservations': {
    en: 'Manage your parking reservations and history',
    th: 'จัดการการจองที่จอดรถและประวัติของคุณ'
  },
  'current_and_upcoming': {
    en: 'Current & Upcoming',
    th: 'ปัจจุบันและกำลังมาถึง'
  },
  'no_active_upcoming_reservations': {
    en: "You don't have any active or upcoming reservations.",
    th: 'คุณไม่มีการจองที่ใช้งานหรือกำลังจะมาถึง'
  },
  'completed_bookings_appear_here': {
    en: 'Your completed bookings will appear here.',
    th: 'การจองที่เสร็จสิ้นของคุณจะปรากฏที่นี่'
  },
  'backup_pin_code': {
    en: 'Backup PIN Code',
    th: 'รหัส PIN สำรอง'
  },
  'use_if_qr_not_work': {
    en: "Use if QR scanner doesn't work",
    th: 'ใช้หากเครื่องสแกน QR ไม่ทำงาน'
  },
  'save_qr': {
    en: 'Save QR',
    th: 'บันทึก QR'
  },

  // ParkingSpotDetail translations
  'parking_spot_not_found': {
    en: 'Parking spot not found',
    th: 'ไม่พบที่จอดรถ'
  },
  'back_to_search': {
    en: 'Back to search',
    th: 'กลับไปค้นหา'
  },
  'previous_image': {
    en: 'Previous image',
    th: 'รูปก่อนหน้า'
  },
  'next_image': {
    en: 'Next image',
    th: 'รูปถัดไป'
  },
  'go_to_image': {
    en: 'Go to image',
    th: 'ไปยังรูป'
  },
  'availability': {
    en: 'Availability',
    th: 'ความพร้อมใช้งาน'
  },
  'spot': {
    en: 'spot',
    th: 'ที่จอด'
  },
  'spots': {
    en: 'spots',
    th: 'ที่จอด'
  },
  'booking_type': {
    en: 'Booking Type',
    th: 'ประเภทการจอง'
  },
  'hourly_rate': {
    en: 'hour',
    th: 'ชั่วโมง'
  },
  'hour_rate': {
    en: 'hour',
    th: 'ชั่วโมง'
  },
  'daily_rate': {
    en: 'day',
    th: 'วัน'
  },
  'day_rate': {
    en: 'day',
    th: 'วัน'
  },
  'monthly_rate': {
    en: 'month',
    th: 'เดือน'
  },
  'month_rate': {
    en: 'month',
    th: 'เดือน'
  },
  'contact': {
    en: 'Contact',
    th: 'ติดต่อ'
  },
  'open_24_7': {
    en: 'Open 24/7',
    th: 'เปิด 24 ชั่วโมง'
  },
  'available_all_day': {
    en: 'Available all day, every day',
    th: 'พร้อมใช้งานตลอดวัน ทุกวัน'
  },
  'about_parking_spot': {
    en: 'About this parking spot',
    th: 'เกี่ยวกับที่จอดรถนี้'
  },
  'no_description_provided': {
    en: 'No description provided for this parking spot.',
    th: 'ไม่มีคำอธิบายสำหรับที่จอดรถนี้'
  },
  'cctv_security': {
    en: 'CCTV Security',
    th: 'กล้องวงจรปิด'
  },
  'free_wifi': {
    en: 'Free WiFi',
    th: 'WiFi ฟรี'
  },
  'cafe_nearby': {
    en: 'Cafe Nearby',
    th: 'ร้านกาแฟใกล้เคียง'
  },
  'car_maintenance': {
    en: 'Car Maintenance',
    th: 'บริการซ่อมรถ'
  },
  'anonymous_user': {
    en: 'Anonymous User',
    th: 'ผู้ใช้นิรนาม'
  },
  'user': {
    en: 'User',
    th: 'ผู้ใช้'
  },
  'review_photo': {
    en: 'Review photo',
    th: 'รูปรีวิว'
  },
  'no_reviews_yet': {
    en: 'No reviews yet',
    th: 'ยังไม่มีรีวิว'
  },
  'be_first_to_review': {
    en: 'Be the first to review this parking spot',
    th: 'เป็นคนแรกที่รีวิวที่จอดรถนี้'
  },
  'call_owner': {
    en: 'Call Owner',
    th: 'โทรหาเจ้าของ'
  },
  'close_fullscreen_image': {
    en: 'Close full screen image',
    th: 'ปิดรูปแบบเต็มจอ'
  },
  'payment_qr_code': {
    en: 'Payment QR Code',
    th: 'QR Code การชำระเงิน'
  },
  'scan_qr_for_payment': {
    en: 'Scan this QR code with your banking app to make a payment',
    th: 'สแกน QR Code นี้ด้วยแอปธนาคารของคุณเพื่อชำระเงิน'
  },

  // Additional amenity translations
  'all': {
    en: 'All',
    th: 'ทั้งหมด'
  },
  'active': {
    en: 'Active',
    th: 'ใช้งานอยู่'
  },
  'confirmed': {
    en: 'Confirmed', 
    th: 'ยืนยันแล้ว'
  },
  'select_time': {
    en: 'Select Time',
    th: 'เลือกเวลา'
  },
  'select_time_slots': {
    en: 'Select Time Slots',
    th: 'เลือกช่วงเวลา'
  },
  'please_select_payment_method': {
    en: 'Please select a payment method',
    th: 'กรุณาเลือกวิธีการชำระเงิน'
  },
  'qr_payment_only_available': {
    en: 'Currently, only QR payment is available. Other payment methods will be available soon.',
    th: 'ขณะนี้มีเฉพาะการชำระเงินผ่าน QR เท่านั้น วิธีการชำระเงินอื่นๆ จะมีให้ใช้เร็วๆ นี้'
  },
  'parking_owner_dashboard': {
    en: 'Parking Owner Dashboard',
    th: 'แดชบอร์ดเจ้าของที่จอดรถ'
  },
  'basic_information': {
    en: 'Basic Information',
    th: 'ข้อมูลพื้นฐาน'
  },
  
  // Payment & QR Code
  'account_name': {
    en: 'Account Name',
    th: 'ชื่อบัญชี'
  },
  'account_name_placeholder': {
    en: 'Your name or business name',
    th: 'ชื่อของคุณหรือชื่อธุรกิจ'
  },
  'qr_code_image': {
    en: 'QR Code Image',
    th: 'รูปภาพ QR Code'
  },
  'upload_qr_code': {
    en: 'Upload QR Code',
    th: 'อัปโหลด QR Code'
  },
  'copy_url': {
    en: 'Copy URL',
    th: 'คัดลอก URL'
  },
  'qr_code_preview': {
    en: 'QR Code Preview',
    th: 'ตัวอย่าง QR Code'
  },
  'qr_ready_upload': {
    en: 'QR Code ready to upload',
    th: 'QR Code พร้อมอัปโหลด'
  },
  'qr_uploaded_success': {
    en: 'QR Code uploaded successfully',
    th: 'อัปโหลด QR Code สำเร็จ'
  },
  'qr_payment_description': {
    en: 'Customers will see this QR code for payments',
    th: 'ลูกค้าจะเห็น QR Code นี้สำหรับการชำระเงิน'
  },
  'save_qr_payment': {
    en: 'Save QR Payment',
    th: 'บันทึกการชำระผ่าน QR'
  },
  'open_scanner': {
    en: 'Open Scanner',
    th: 'เปิดสแกนเนอร์'
  },
  'entry_exit_validation_description': {
    en: 'Scan customer QR codes or enter PIN for parking entry and exit validation',
    th: 'สแกน QR Code ของลูกค้าหรือใส่ PIN เพื่อตรวจสอบการเข้าและออกที่จอดรถ'
  },
  
  // Dashboard sections
  'todays_bookings': {
    en: "Today's Bookings",
    th: 'การจองวันนี้'
  },
  'no_bookings_today': {
    en: 'No bookings today',
    th: 'ไม่มีการจองวันนี้'
  },
  'quick_actions': {
    en: 'Quick Actions',
    th: 'การดำเนินการด่วน'
  },
  'report_issue': {
    en: 'Report Issue',
    th: 'รายงานปัญหา'
  },
  'booking_hash': {
    en: 'Booking #{{id}} - {{status}}',
    th: 'การจอง #{{id}} - {{status}}'
  },
  'add_new_spot': {
    en: 'Add New Spot',
    th: 'เพิ่มที่จอดใหม่'
  },
  'add_first_spot': {
    en: 'Add Your First Spot',
    th: 'เพิ่มที่จอดแรกของคุณ'
  },
  'pending_approval': {
    en: 'Pending Approval',
    th: 'รอการอนุมัติ'
  },
  'inactive': {
    en: 'Inactive',
    th: 'ไม่ใช้งาน'
  },
  'available_slots': {
    en: '{{available}}/{{total}} available',
    th: 'ว่าง {{available}}/{{total}}'
  },
  
  'total_parking_slots': {
    en: '{{total}} parking slots',
    th: 'ที่จอดรถ {{total}} ช่อง'
  },
  
  // Booking Management
  'booking_management': {
    en: 'Booking Management',
    th: 'การจัดการการจอง'
  },
  'search_bookings': {
    en: 'Search bookings...',
    th: 'ค้นหาการจอง...'
  },
  'table_id': {
    en: 'ID',
    th: 'รหัส'
  },
  'table_date': {
    en: 'Date',
    th: 'วันที่'
  },
  'table_customer': {
    en: 'Customer',
    th: 'ลูกค้า'
  },
  'table_status': {
    en: 'Status',
    th: 'สถานะ'
  },
  'table_amount': {
    en: 'Amount',
    th: 'ยอดเงิน'
  },
  'no_bookings_found': {
    en: 'No bookings found.',
    th: 'ไม่พบการจอง'
  },
  'payment_colon': {
    en: 'Payment: {{status}}',
    th: 'การชำระเงิน: {{status}}'
  },
  
  // Reviews & Feedback
  'reviews_feedback': {
    en: 'Reviews & Feedback',
    th: 'รีวิวและข้อเสนอแนะ'
  },
  'reviews_count': {
    en: '{{count}} review{{plural}}',
    th: '{{count}} รีวิว'
  },
  'anonymous_customer': {
    en: 'Anonymous Customer',
    th: 'ลูกค้าไม่ระบุชื่อ'
  },
  'customer_review': {
    en: 'Customer Review',
    th: 'รีวิวลูกค้า'
  },
  'reviews_will_appear': {
    en: 'Reviews will appear here once customers start rating your parking spots',
    th: 'รีวิวจะปรากฏที่นี่เมื่อลูกค้าเริ่มให้คะแนนที่จอดรถของคุณ'
  },
  
  // Reports & Analytics
  'reports_analytics': {
    en: 'Reports & Analytics',
    th: 'รายงานและการวิเคราะห์'
  },
  'export_report': {
    en: 'Export Report',
    th: 'ส่งออกรายงาน'
  },
  'revenue': {
    en: 'Revenue',
    th: 'รายได้'
  },
  'total_earned': {
    en: 'Total earned',
    th: 'รายได้รวม'
  },
  
  // Settings
  'owner_information': {
    en: 'Owner Information',
    th: 'ข้อมูลเจ้าของ'
  },
  'edit_in_profile': {
    en: 'Edit in Profile Page',
    th: 'แก้ไขในหน้าโปรไฟล์'
  },
  'not_set': {
    en: 'Not set',
    th: 'ยังไม่ได้ตั้งค่า'
  },
  'bank_account_transfer': {
    en: 'Bank Account Transfer',
    th: 'การโอนเงินผ่านบัญชีธนาคาร'
  },
  'bank_transfer_description': {
    en: 'Accept direct bank transfers (Coming Soon)',
    th: 'รับการโอนเงินจากธนาคารโดยตรง (เร็วๆ นี้)'
  },
  'next_phase': {
    en: 'Next Phase',
    th: 'เฟสถัดไป'
  },
  'bank_integration_notice': {
    en: 'Bank account payment integration will be available in the next phase of development.',
    th: 'การเชื่อมต่อการชำระเงินผ่านบัญชีธนาคารจะพร้อมใช้งานในเฟสการพัฒนาถัดไป'
  },
  
  // Notification Preferences
  'notification_preferences': {
    en: 'Notification Preferences',
    th: 'การตั้งค่าการแจ้งเตือน'
  },
  'new_bookings': {
    en: 'New Bookings',
    th: 'การจองใหม่'
  },
  'new_bookings_desc': {
    en: 'Get notified when customers make new bookings',
    th: 'รับการแจ้งเตือนเมื่อลูกค้าทำการจองใหม่'
  },
  'payment_received': {
    en: 'Payment Received',
    th: 'ได้รับการชำระเงิน'
  },
  'payment_received_desc': {
    en: 'Receive alerts when payments are processed',
    th: 'รับการแจ้งเตือนเมื่อมีการประมวลผลการชำระเงิน'
  },
  'customer_reviews': {
    en: 'Customer Reviews',
    th: 'รีวิวลูกค้า'
  },
  'customer_reviews_desc': {
    en: 'Be notified of new customer reviews',
    th: 'รับการแจ้งเตือนรีวิวลูกค้าใหม่'
  },
  'system_updates': {
    en: 'System Updates',
    th: 'อัปเดตระบบ'
  },
  'system_updates_desc': {
    en: 'Important system and feature updates',
    th: 'อัปเดตระบบและฟีเจอร์สำคัญ'
  },
  
  // Payment Verification
  'payment_verification': {
    en: 'Payment Verification',
    th: 'การตรวจสอบการชำระเงิน'
  },
  'pending_count': {
    en: '{{count}} Pending',
    th: '{{count}} รอดำเนินการ'
  },
  'unknown_customer': {
    en: 'Unknown customer',
    th: 'ลูกค้าไม่ทราบชื่อ'
  },
  'no_pending_payments': {
    en: 'No pending payments to verify',
    th: 'ไม่มีการชำระเงินรอตรวจสอบ'
  },
  'all_payments_processed': {
    en: 'All payment slips have been processed',
    th: 'สลิปการชำระเงินทั้งหมดได้ดำเนินการแล้ว'
  },
  'verify': {
    en: 'Verify',
    th: 'ตรวจสอบ'
  },
  
  // Navigation tabs
  'my_spots': {
    en: 'My Spots',
    th: 'ที่จอดของฉัน'
  },
  'dashboard_description': {
    en: 'Manage your parking spots and monitor performance',
    th: 'จัดการที่จอดรถและติดตามประสิทธิภาพ'
  },
  'recent_activity': {
    en: 'Recent Activity',
    th: 'กิจกรรมล่าสุด'
  },
  
   
  // Alert messages
  'qr_payment_saved': {
    en: 'QR Code payment method saved successfully!',
    th: 'บันทึกวิธีการชำระเงินผ่าน QR Code สำเร็จ!'
  },
  'bank_payment_saved': {
    en: 'Bank Account payment method saved successfully!',
    th: 'บันทึกวิธีการชำระเงินผ่านบัญชีธนาคารสำเร็จ!'
  },
  'qr_url_copied': {
    en: 'QR Code URL copied to clipboard!',
    th: 'คัดลอก URL ของ QR Code ไปยังคลิปบอร์ดแล้ว!'
  },
  'failed_upload_qr': {
    en: 'Failed to upload QR code image',
    th: 'ไม่สามารถอัปโหลดรูป QR Code ได้'
  },
  'invalid_qr_pin': {
    en: 'Invalid QR code or PIN. No matching booking found.',
    th: 'QR Code หรือ PIN ไม่ถูกต้อง ไม่พบการจองที่ตรงกัน'
  },
  'qr_not_valid_spot': {
    en: 'QR code is not valid for this parking spot.',
    th: 'QR Code ไม่ถูกต้องสำหรับที่จอดรถนี้'
  },
  
  // Incomplete booking session
  'incomplete_booking_found': {
    en: 'Incomplete Booking Found',
    th: 'พบการจองที่ยังไม่เสร็จ'
  },
  'incomplete_booking_message': {
    en: 'You have an incomplete booking session. Would you like to continue where you left off?',
    th: 'คุณมีการจองที่ยังไม่เสร็จ คุณต้องการจองต่อจากที่ค้างไว้หรือไม่?'
  },
  'continue_booking': {
    en: 'Continue Booking',
    th: 'จองต่อ'
  },
  'start_new_booking': {
    en: 'Start New Booking',
    th: 'เริ่มจองใหม่'
  },
  'booking_session_restored': {
    en: 'Your previous booking session has been restored',
    th: 'กู้คืนการจองก่อนหน้าแล้ว'
  },
  'restored_to_step': {
    en: 'Restored to step',
    th: 'กู้คืนไปยังขั้นตอน'
  },
  'time_selection_step': {
    en: 'Time Selection',
    th: 'เลือกเวลา'
  },
  'verification_step': {
    en: 'Payment Verification',
    th: 'ตรวจสอบการชำระเงิน'
  },
  'current_time_thailand': {
    en: 'Current time in Thailand',
    th: 'เวลาปัจจุบันในประเทศไทย'
  },
  'incomplete_payment_alert': {
    en: 'You have an incomplete booking that needs payment slip upload',
    th: 'คุณมีการจองที่ยังไม่ได้อัปโหลดสลิปการชำระเงิน'
  },
  'incomplete_session_description': {
    en: 'You left off at',
    th: 'คุณอยู่ที่ขั้นตอน'
  },
  'incomplete_session_step_time_selection': {
    en: 'Time Selection',
    th: 'เลือกเวลา'
  },
  'incomplete_session_step_payment_method': {
    en: 'Payment Method Selection',
    th: 'เลือกวิธีการชำระเงิน'
  },
  'incomplete_session_step_upload_slip': {
    en: 'Upload Payment Slip',
    th: 'อัปโหลดสลิปการชำระเงิน'
  },
  'incomplete_session_step_completed': {
    en: 'Booking Completed',
    th: 'การจองเสร็จสิ้น'
  },
  'incomplete_session_step_unknown': {
    en: 'Unknown Step',
    th: 'ขั้นตอนไม่ทราบ'
  },
  'booking_already_completed_message': {
    en: 'Your booking has been completed successfully! You can view the details in your bookings page.',
    th: 'การจองของคุณเสร็จสิ้นแล้ว! คุณสามารถดูรายละเอียดได้ในหน้าประวัติการจอง'
  },
  'booking_status': {
    en: 'Booking Status',
    th: 'สถานะการจอง'
  },
  'view_bookings': {
    en: 'View Bookings',
    th: 'ดูประวัติการจอง'
  },
  'complete_payment': {
    en: 'Complete Payment',
    th: 'ชำระเงินให้เสร็จ'
  },
  'dismiss': {
    en: 'Dismiss',
    th: 'ปิด'
  },
  'previous_selection': {
    en: 'Previous Selection',
    th: 'การเลือกก่อนหน้า'
  },
  'step': {
    en: 'Step',
    th: 'ขั้นตอน'
  },
  'current_time': {
    en: 'Current Time',
    th: 'เวลาปัจจุบัน'
  },
  
  // Dashboard stats
  'todays_revenue': {
    en: "Today's Revenue",
    th: 'รายได้วันนี้'
  },
  'avg_rating': {
    en: 'Avg Rating',
    th: 'คะแนนเฉลี่ย'
  },
  
  // Form validation messages
  'please_select_image_file': {
    en: 'Please select an image file',
    th: 'กรุณาเลือกไฟล์รูปภาพ'
  },
  'file_size_limit_5mb': {
    en: 'File size must be less than 5MB',
    th: 'ขนาดไฟล์ต้องน้อยกว่า 5MB'
  },
  'user_profile_not_found': {
    en: 'User profile not found',
    th: 'ไม่พบข้อมูลผู้ใช้'
  },
  'failed_save_payment_method': {
    en: 'Failed to save payment method',
    th: 'ไม่สามารถบันทึกวิธีการชำระเงินได้'
  },
  'payment_approved_success': {
    en: 'Payment approved successfully!',
    th: 'อนุมัติการชำระเงินเรียบร้อยแล้ว!'
  },
  'payment_rejected_success': {
    en: 'Payment rejected successfully!',
    th: 'ปฏิเสธการชำระเงินเรียบร้อยแล้ว!'
  },
  
  // QR Scanner messages
  'processing_scan': {
    en: 'Processing scan...',
    th: 'กำลังประมวลผลการสแกน...'
  },
  'booking_not_for_your_spot': {
    en: 'This booking is not for one of your parking spots.',
    th: 'การจองนี้ไม่ใช่สำหรับที่จอดรถของคุณ'
  },
  'entry_confirmed_booking_active': {
    en: 'Entry confirmed! Booking is now active.',
    th: 'ยืนยันการเข้าแล้ว! การจองเริ่มใช้งานแล้ว'
  },
  'exit_confirmed_booking_completed': {
    en: 'Exit confirmed! Booking is now completed.',
    th: 'ยืนยันการออกแล้ว! การจองเสร็จสิ้นแล้ว'
  },
  'booking_cancelled_qr_verified': {
    en: 'Booking #{id} was cancelled - QR/PIN verified successfully',
    th: 'การจอง #{id} ถูกยกเลิกไปแล้ว - QR/PIN ยืนยันสำเร็จ'
  },
  'scan_error_message': {
    en: 'Error: {error}',
    th: 'ข้อผิดพลาด: {error}'
  },
  'failed_process_scan': {
    en: 'Failed to process scan',
    th: 'ไม่สามารถประมวลผลการสแกนได้'
  },

  // Booking Detail Modal
  'customer_information': {
    en: 'Customer Information',
    th: 'ข้อมูลลูกค้า'
  },
  'customer_name': {
    en: 'Customer Name',
    th: 'ชื่อลูกค้า'
  },
  'customer_id': {
    en: 'Customer ID',
    th: 'รหัสลูกค้า'
  },
  'not_available': {
    en: 'Not Available',
    th: 'ไม่มีข้อมูล'
  },
  'parking_information': {
    en: 'Parking Information',
    th: 'ข้อมูลที่จอดรถ'
  },
  'parking_spot': {
    en: 'Parking Spot',
    th: 'ที่จอดรถ'
  },
  'payment_information': {
    en: 'Payment Information',
    th: 'ข้อมูลการชำระเงิน'
  },
  'total_amount': {
    en: 'Total Amount',
    th: 'ยอดรวม'
  },

  'created_at': {
    en: 'Created At',
    th: 'สร้างเมื่อ'
  },

  // Payment Status Translations
  'payment_paid': {
    en: 'Paid',
    th: 'ชำระแล้ว'
  },
  'payment_pending': {
    en: 'Pending',
    th: 'รอดำเนินการ'
  },
  'payment_verified': {
    en: 'Verified',
    th: 'ตรวจสอบแล้ว'
  },
  'payment_rejected': {
    en: 'Rejected',
    th: 'ถูกปฏิเสธ'
  },

  // Status Translations
  'status_pending': {
    en: 'Pending',
    th: 'รอดำเนินการ'
  },
  'status_confirmed': {
    en: 'Confirmed',
    th: 'ยืนยันแล้ว'
  },
  'status_active': {
    en: 'Active',
    th: 'กำลังใช้งาน'
  },
  'status_completed': {
    en: 'Completed',
    th: 'เสร็จสิ้น'
  },
  'status_cancelled': {
    en: 'Cancelled',
    th: 'ยกเลิกแล้ว'
  },
  'status_expired': {
    en: 'Expired',
    th: 'หมดอายุ'
  },

  // Payment Method Translations
  'payment_method_qr_code': {
    en: 'QR Code',
    th: 'รหัส QR'
  },
  'payment_method_bank_transfer': {
    en: 'Bank Transfer',
    th: 'โอนเงิน'
  },
  'payment_method_cash': {
    en: 'Cash',
    th: 'เงินสด'
  },
  'payment_method_credit_card': {
    en: 'Credit Card',
    th: 'บัตรเครดิต'
  },

  // Add Parking Spot Form
  'add_parking_spot_title': {
    en: 'Add New Parking Spot',
    th: 'เพิ่มที่จอดรถใหม่'
  },
  'spot_basic_information': {
    en: 'Basic Information',
    th: 'ข้อมูลพื้นฐาน'
  },
  'spot_name_label': {
    en: 'Parking Spot Name',
    th: 'ชื่อที่จอดรถ'
  },
  'spot_name_placeholder': {
    en: 'e.g., Central Plaza Parking',
    th: 'เช่น ที่จอดรถเซ็นทรัลพลาซ่า'
  },
  'spot_address_label': {
    en: 'Address',
    th: 'ที่อยู่'
  },
  'spot_address_placeholder': {
    en: 'Full address of the parking spot',
    th: 'ที่อยู่เต็มของที่จอดรถ'
  },
  'spot_description_label': {
    en: 'Description',
    th: 'คำอธิบาย'
  },
  'spot_description_placeholder': {
    en: 'Describe your parking spot, its features, and any important information...',
    th: 'อธิบายที่จอดรถของคุณ คุณสมบัติ และข้อมูลสำคัญอื่นๆ...'
  },
  'spot_location_on_map': {
    en: 'Location on Map',
    th: 'ตำแหน่งบนแผนที่'
  },
  'spot_pricing_and_capacity': {
    en: 'Pricing & Capacity',
    th: 'ราคาและจำนวนช่อง'
  },
  'spot_total_slots_label': {
    en: 'Total Parking Slots',
    th: 'ที่จอดรถทั้งหมด'
  },
  'spot_total_slots_description': {
    en: 'Total number of parking spaces available for service',
    th: 'จำนวนช่องจอดรถทั้งหมดที่มีพร้อมให้บริการ'
  },
  'spot_pricing_options': {
    en: 'Pricing Options',
    th: 'ตัวเลือกราคา'
  },
  'spot_pricing_description': {
    en: 'Select the pricing types you want to offer',
    th: 'เลือกประเภทการชำระเงินที่ต้องการเปิดให้บริการ'
  },
  'pricing_hourly': {
    en: 'Hourly',
    th: 'รายชั่วโมง'
  },
  'pricing_daily': {
    en: 'Daily',
    th: 'รายวัน'
  },
  'pricing_monthly': {
    en: 'Monthly',
    th: 'รายเดือน'
  },
  'pricing_per_hour': {
    en: 'per hour',
    th: 'ต่อชั่วโมง'
  },
  'pricing_per_day': {
    en: 'per day',
    th: 'ต่อวัน'
  },
  'pricing_per_month': {
    en: 'per month',
    th: 'ต่อเดือน'
  },
  'pricing_enable_all': {
    en: 'Enable All',
    th: 'เปิดทั้งหมด'
  },
  'pricing_clear_all': {
    en: 'Clear All',
    th: 'ล้างทั้งหมด'
  },
  'spot_amenities': {
    en: 'Amenities',
    th: 'สิ่งอำนวยความสะดวก'
  },
  'spot_photos_required': {
    en: 'Photos (Required)',
    th: 'รูปภาพ (จำเป็น)'
  },
  'spot_images_count': {
    en: '{{count}}/4 images',
    th: '{{count}}/4 รูป'
  },
  'spot_upload_image': {
    en: 'Upload Image',
    th: 'อัปโหลดรูปภาพ'
  },
  'spot_upload_photos_description': {
    en: 'Upload clear photos of your parking spot (min 1, max 4 images)',
    th: 'อัปโหลดรูปภาพที่ชัดเจนของที่จอดรถ (ขั้นต่ำ 1 รูป สูงสุด 4 รูป)'
  },
  'spot_at_least_one_image_required': {
    en: 'At least one image is required',
    th: 'จำเป็นต้องมีรูปภาพอย่างน้อย 1 รูป'
  },
  'spot_cancel': {
    en: 'Cancel',
    th: 'ยกเลิก'
  },
  'spot_creating': {
    en: 'Creating...',
    th: 'กำลังสร้าง...'
  },
  'spot_create_button': {
    en: 'Create Parking Spot',
    th: 'สร้างที่จอดรถ'
  },
  'spot_back_to_dashboard': {
    en: 'Back to Dashboard',
    th: 'กลับไปยังแดชบอร์ด'
  },
  'spot_form_description': {
    en: 'Fill in the details to create a new parking spot listing',
    th: 'กรอกรายละเอียดเพื่อสร้างรายการที่จอดรถใหม่'
  },
  
  // Opening Hours translations
  'opening_hours': {
    en: 'Opening Hours',
    th: 'เวลาเปิด-ปิด'
  },
  'select_all_days': {
    en: 'Select All Days',
    th: 'เลือกทุกวัน'
  },
  '24_7_access': {
    en: '24/7 Access',
    th: 'เปิด 24 ชั่วโมง'
  },
  '24_hours': {
    en: '24 Hours',
    th: '24 ชั่วโมง'
  },
  'to': {
    en: 'to',
    th: 'ถึง'
  },
  '24_7_access_available': {
    en: '24/7 Access Available',
    th: 'เปิดให้บริการ 24 ชั่วโมง'
  },
  
  // Error messages
  'spot_max_images_alert': {
    en: 'Maximum 4 images allowed',
    th: 'อนุญาตไฟล์สูงสุด 4 รูป'
  },
  'spot_file_not_image_alert': {
    en: 'File {{fileName}} is not an image',
    th: 'ไฟล์ {{fileName}} ไม่ใช่รูปภาพ'
  },
  'spot_file_size_exceeded_alert': {
    en: 'File {{fileName}} exceeds 5MB limit',
    th: 'ไฟล์ {{fileName}} เกินขนาด 5MB'
  },
  'spot_required_fields_error': {
    en: 'Please fill in all required fields and enable at least one pricing option',
    th: 'กรุณากรอกข้อมูลที่จำเป็นทั้งหมดและเปิดอย่างน้อยหนึ่งตัวเลือกราคา'
  },
  'spot_valid_prices_error': {
    en: 'Please set valid prices for all enabled pricing options',
    th: 'กรุณาตั้งราคาที่ถูกต้องสำหรับตัวเลือกราคาที่เปิดใช้งานทั้งหมด'
  },
  'spot_one_image_required_error': {
    en: 'Please add at least one image of your parking spot',
    th: 'กรุณาเพิ่มรูปภาพของที่จอดรถอย่างน้อยหนึ่งรูป'
  },
  'spot_login_required_error': {
    en: 'You must be logged in to add a parking spot.',
    th: 'คุณต้องเข้าสู่ระบบเพื่อเพิ่มที่จอดรถ'
  },
  'spot_owner_pending_approval_error': {
    en: 'Your owner account is pending admin approval. You cannot add parking spots yet.',
    th: 'บัญชีเจ้าของของคุณกำลังรออนุมัติจากผู้ดูแลระบบ คุณยังไม่สามารถเพิ่มที่จอดรถได้'
  },
  'spot_creation_failed_error': {
    en: 'Failed to add parking spot. Please try again.',
    th: 'ไม่สามารถเพิ่มที่จอดรถได้ กรุณาลองใหม่อีกครั้ง'
  },
  'amenity_ev_charging': {
    en: 'EV Charging',
    th: 'ชาร์จรถยนต์ไฟฟ้า'
  },
  'amenity_cctv': {
    en: 'CCTV Security',
    th: 'กล้องวงจรปิด'
  },
  'amenity_covered': {
    en: 'Covered Parking',
    th: 'ที่จอดรถมีหลังคา'
  },
  'amenity_wifi': {
    en: 'Free WiFi',
    th: 'WiFi ฟรี'
  },
  'amenity_cafe': {
    en: 'Cafe Nearby',
    th: 'ร้านกาแฟใกล้เคียง'
  },
  'amenity_maintenance': {
    en: 'Car Maintenance',
    th: 'บริการซ่อมรถ'
  },
  'amenities.evCharging': {
    en: 'EV Charging',
    th: 'จุดชาร์จรถยนต์ไฟฟ้า'
  },
  'amenities.wifi': {
    en: 'WiFi',
    th: 'WiFi'
  },
  'amenities.cctvSecurity': {
    en: 'CCTV Security',
    th: 'กล้องวงจรปิด'
  },
  'amenities.covered': {
    en: 'Covered',
    th: 'มีหลังคา'
  },
  'amenities.elevator': {
    en: 'Elevator',
    th: 'ลิฟต์'
  },
  'amenities.access24_7': {
    en: '24/7 Access',
    th: 'เข้าได้ 24/7'
  },
  'amenities.shopping': {
    en: 'Shopping',
    th: 'ช้อปปิ้ง'
  },
  'amenities.foodCourt': {
    en: 'Food Court',
    th: 'ศูนย์อาหาร'
  },
  'amenities.cafeNearby': {
    en: 'Cafe Nearby',
    th: 'คาเฟ่ใกล้เคียง'
  },
  'amenities.valetService': {
    en: 'Valet Service',
    th: 'บริการรับจอดรถ'
  },
  'amenities.carWash': {
    en: 'Car Wash',
    th: 'ล้างรถ'
  },
  'amenities.shuttle': {
    en: 'Shuttle',
    th: 'รถรับส่ง'
  },
  'amenities.storage': {
    en: 'Storage',
    th: 'ที่เก็บของ'
  },
  'amenities.restroom': {
    en: 'Restroom',
    th: 'ห้องน้ำ'
  },
  'amenities.accessible': {
    en: 'Accessible',
    th: 'เข้าถึงง่าย'
  },
  'amenities.secureAccess': {
    en: 'Secure Access',
    th: 'เข้าได้อย่างปลอดภัย'
  },
  'amenities.smartParking': {
    en: 'Smart Parking',
    th: 'ที่จอดรถอัจฉริยะ'
  },
  'amenities.payment': {
    en: 'Payment',
    th: 'การชำระเงิน'
  },
  'amenities.standardParking': {
    en: 'Standard Parking',
    th: 'ที่จอดรถมาตรฐาน'
  },

  // Status for availability
  'status.full': {
    en: 'Full',
    th: 'เต็ม'
  },
  'status.available_hours': {
    en: 'Available within 2 hours',
    th: 'ว่างภายใน 2 ชั่วโมงนี้'
  },

  // Additional card-related translations
  'open24_7': {
    en: 'Open 24/7',
    th: 'เปิด 24/7'
  },
  'checkHours': {
    en: 'Check hours',
    th: 'ตรวจสอบเวลา'
  },
  'bookNow': {
    en: 'Book Now',
    th: 'จองเลย'
  },
  'scan_qr_payment_amount': {
    en: 'Scan this QR code with your banking app to make a payment of ${{amount}}',
    th: 'สแกน QR Code นี้ด้วยแอปธนาคารเพื่อชำระเงินจำนวน ${{amount}}'
  },

  'hourly_booking': {
    en: 'Hourly',
    th: 'รายชั่วโมง'
  },
  'daily_booking': {
    en: 'Daily',
    th: 'รายวัน'
  },
  'monthly_booking': {
    en: 'Monthly',
    th: 'รายเดือน'
  },
};

type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string, params?: Record<string, any>): string => {
    let translation = translations[key]?.[language] || key;
    
    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
