// // components/AIQuestMaster.tsx
// import React, { useState } from 'react';
// import { Sparkles, Wand2 } from 'lucide-react';
// import AIQuestSuggestion from './AIQuestSuggestion';

// interface AIQuestMasterProps {
//   onQuestAccepted?: (quest: any) => void;
// }

// const AIQuestMaster: React.FC<AIQuestMasterProps> = ({ onQuestAccepted }) => {
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const handleSuggest = () => {
//     setIsModalOpen(true);
//   };

//   const handleQuestAccepted = (quest: any) => {
//     console.log('Quest accepted:', quest);
//     if (onQuestAccepted) {
//       onQuestAccepted(quest);
//     }
//     setIsModalOpen(false);
//   };

//   return (
//     <>
//       {/* AI Quest Master Card/Button */}
//       <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center space-x-3">
//             <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
//               <Wand2 className="h-5 w-5" />
//             </div>
//             <div>
//               <h3 className="font-bold">AI Quest Master</h3>
//               <p className="text-sm text-white/80">Stuck? Get a quest suggestion!</p>
//             </div>
//           </div>

//           <button
//             onClick={handleSuggest}
//             className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
//           >
//             <Sparkles size={16} />
