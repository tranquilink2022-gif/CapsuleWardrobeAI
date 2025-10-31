import { useState } from 'react';
import BottomNav from '../BottomNav';

export default function BottomNavExample() {
  const [activeTab, setActiveTab] = useState('capsules');
  
  return <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />;
}
