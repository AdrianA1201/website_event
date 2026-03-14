import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Trophy, Edit2, Settings, Star } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  manual_points: number;
}

interface Vote {
  id: string;
  team_id: string;
  voter_name: string;
  scores: Record<string, number>;
  total_score: number;
}

export default function VotingAdmin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout to prevent infinite loading if there are permission issues
    const timer = setTimeout(() => setLoading(false), 2000);

    const unsubTeams = onSnapshot(query(collection(db, 'teams')), (snapshot) => {
      const t: Team[] = [];
      snapshot.forEach((doc) => {
        t.push({ ...doc.data() as Team, id: doc.id });
      });
      setTeams(t);
      setLoading(false);
    }, (err) => console.error("Teams error:", err));

    const unsubVotes = onSnapshot(query(collection(db, 'votes')), (snapshot) => {
      const v: Vote[] = [];
      snapshot.forEach((doc) => {
        v.push({ ...doc.data() as Vote, id: doc.id });
      });
      setVotes(v);
    }, (err) => console.error("Votes error:", err));

    const unsubConfig = onSnapshot(doc(db, 'config', 'voting'), (docSnap) => {
      if (docSnap.exists()) {
        setCategories(docSnap.data().categories || []);
      } else {
        setCategories([]);
      }
    }, (err) => console.error("Config error:", err));

    return () => {
      clearTimeout(timer);
      unsubTeams();
      unsubVotes();
      unsubConfig();
    };
  }, []);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeamName.trim(),
        manual_points: 0,
        created_at: serverTimestamp()
      });
      setNewTeamName('');
    } catch (err: any) {
      console.error('Error adding team:', err);
      alert(`Failed to add team: ${err.message}`);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
    } catch (err) {
      console.error('Error deleting team:', err);
    }
  };

  const handleUpdateManualPoints = async (id: string, currentPoints: number, change: number) => {
    try {
      await updateDoc(doc(db, 'teams', id), {
        manual_points: currentPoints + change
      });
    } catch (err) {
      console.error('Error updating points:', err);
    }
  };

  const handleSetManualPoints = async (id: string, value: string) => {
    const points = parseInt(value);
    if (isNaN(points)) return;
    try {
      await updateDoc(doc(db, 'teams', id), {
        manual_points: points
      });
    } catch (err) {
      console.error('Error setting points:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      alert('Category already exists');
      return;
    }

    try {
      const newCategories = [...categories, newCategoryName.trim()];
      await setDoc(doc(db, 'config', 'voting'), { categories: newCategories }, { merge: true });
      setNewCategoryName('');
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${catToDelete}"?`)) return;
    try {
      const newCategories = categories.filter(c => c !== catToDelete);
      await setDoc(doc(db, 'config', 'voting'), { categories: newCategories }, { merge: true });
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const getTeamScore = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    const teamVotes = votes.filter(v => v.team_id === teamId);
    const totalVoteScore = teamVotes.reduce((sum: number, v: Vote) => sum + (v.total_score || 0), 0);
    return (team?.manual_points || 0) + totalVoteScore;
  };

  const sortedTeams = [...teams].sort((a, b) => getTeamScore(b.id) - getTeamScore(a.id));

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Voting Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Manage teams, scoring categories, and view live results.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar: Add Team & Categories */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add Team Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-indigo-500" />
              Manage Teams
            </h2>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  placeholder="e.g. Red Team"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </button>
            </form>
          </div>

          {/* Manage Categories */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-indigo-500" />
              Scoring Categories
            </h2>
            <form onSubmit={handleAddCategory} className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Category</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  placeholder="e.g. Presentation"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </button>
            </form>

            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No categories added.</p>
              ) : (
                categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <Star className="w-4 h-4 mr-2 text-yellow-500" />
                      {cat}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dashboard & Teams List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Live Leaderboard
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {sortedTeams.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No teams added yet.</div>
              ) : (
                sortedTeams.map((team, index) => {
                  const score = getTeamScore(team.id);
                  const teamVotes = votes.filter(v => v.team_id === team.id);
                  
                  return (
                    <div key={team.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                          <p className="text-sm text-gray-500">
                            {teamVotes.length} voters
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-2xl font-bold text-indigo-600">
                          {score} <span className="text-sm font-normal text-gray-500">pts</span>
                        </div>
                        
                        <div className="flex items-center gap-2 border-l pl-6">
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500 mb-1">Manual Pts</span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleUpdateManualPoints(team.id, team.manual_points, -1)}
                                className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                              >-</button>
                              <input 
                                type="number"
                                value={team.manual_points}
                                onChange={(e) => handleSetManualPoints(team.id, e.target.value)}
                                className="w-14 text-center font-medium border border-gray-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button 
                                onClick={() => handleUpdateManualPoints(team.id, team.manual_points, 1)}
                                className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                              >+</button>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full ml-2"
                            title="Delete Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
