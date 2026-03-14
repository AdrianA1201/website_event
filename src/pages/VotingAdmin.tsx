import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plus, Trash2, Trophy, Edit2, Settings, Star, Share2, Link, Copy, Check } from 'lucide-react';

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
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedTeamsForLink, setSelectedTeamsForLink] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamPoints, setEditTeamPoints] = useState(0);
  const [editingVoteId, setEditingVoteId] = useState<string | null>(null);
  const [editVoteScore, setEditVoteScore] = useState<number>(0);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [deletingVoteId, setDeletingVoteId] = useState<string | null>(null);

  useEffect(() => {
    // Debugging: Log current user info
    if (auth.currentUser) {
      console.log("Current User:", {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified
      });
    } else {
      console.log("No user logged in");
    }

    // Timeout to prevent infinite loading if there are permission issues
    const timer = setTimeout(() => {
      setLoading((prevLoading) => {
        if (prevLoading) {
          setError('Loading timed out. You might not have permission to view this page.');
          return false;
        }
        return prevLoading;
      });
    }, 5000);

    const unsubTeams = onSnapshot(query(collection(db, 'teams')), (snapshot) => {
      clearTimeout(timer);
      const t: Team[] = [];
      snapshot.forEach((doc) => {
        t.push({ ...doc.data() as Team, id: doc.id });
      });
      setTeams(t);
      setLoading(false);
    }, (err) => {
      clearTimeout(timer);
      console.error("Teams error:", err);
      setError('Permission denied for Teams. Please ensure you are logged in as an admin.');
      setLoading(false);
    });

    const unsubVotes = onSnapshot(query(collection(db, 'votes')), (snapshot) => {
      const v: Vote[] = [];
      snapshot.forEach((doc) => {
        v.push({ ...doc.data() as Vote, id: doc.id });
      });
      setVotes(v);
    }, (err) => {
      console.error("Votes error:", err);
      // Don't set global error for votes if teams worked, but log it
    });

    return () => {
      clearTimeout(timer);
      unsubTeams();
      unsubVotes();
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
    try {
      await deleteDoc(doc(db, 'teams', id));
      setDeletingTeamId(null);
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

  const handleEditTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editTeamName.trim()) return;
    try {
      await updateDoc(doc(db, 'teams', editingTeam.id), {
        name: editTeamName.trim(),
        manual_points: editTeamPoints
      });
      setEditingTeam(null);
      setEditingVoteId(null);
    } catch (err: any) {
      console.error('Error updating team:', err);
      alert(`Failed to update team: ${err.message}`);
    }
  };

  const handleSaveVoteEdit = async (voteId: string) => {
    try {
      await updateDoc(doc(db, 'votes', voteId), {
        total_score: editVoteScore
      });
      setEditingVoteId(null);
    } catch (err) {
      console.error('Error updating vote:', err);
    }
  };

  const handleDeleteVote = async (voteId: string) => {
    try {
      await deleteDoc(doc(db, 'votes', voteId));
      setDeletingVoteId(null);
    } catch (err) {
      console.error('Error deleting vote:', err);
    }
  };

  const getVotingLink = (teamIds: string[]) => {
    const baseUrl = window.location.origin;
    if (teamIds.length === 0) return `${baseUrl}/vote`;
    return `${baseUrl}/vote?teamIds=${teamIds.join(',')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
          {error}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Voting Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Manage teams, scoring categories, and view live results.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar: Add Team */}
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
        </div>

        {/* Dashboard & Teams List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Live Leaderboard
              </h2>
              <button
                onClick={() => setShowVoteModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Vote Link
              </button>
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
                          <button
                            onClick={() => {
                              setSelectedTeamsForLink([team.id]);
                              setShowVoteModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                            title="Share Voting Link"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          
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
                            onClick={() => {
                              setEditingTeam(team);
                              setEditTeamName(team.name);
                              setEditTeamPoints(team.manual_points);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full ml-2"
                            title="Edit Team"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {deletingTeamId === team.id ? (
                            <div className="flex items-center gap-1 ml-2 bg-red-50 p-1 rounded-lg border border-red-100">
                              <button onClick={() => handleDeleteTeam(team.id)} className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1">Confirm</button>
                              <button onClick={() => setDeletingTeamId(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingTeamId(team.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                              title="Delete Team"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Create Vote Link Modal */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Create Voting Link</h3>
              <button onClick={() => { setShowVoteModal(false); setSelectedTeamsForLink([]); }} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700 font-medium mb-2">General Voting Link (All Teams):</p>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                  <code className="text-xs text-gray-600 truncate flex-1">
                    {window.location.origin}/vote
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`${window.location.origin}/vote`)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Voters can select any team from the list.</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or Select Specific Teams</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Teams to include in link:</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={selectedTeamsForLink.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeamsForLink(prev => [...prev, t.id]);
                          } else {
                            setSelectedTeamsForLink(prev => prev.filter(id => id !== t.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedTeamsForLink.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-sm text-indigo-700 font-medium mb-2">Custom Voter Link:</p>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-indigo-200">
                      <code className="text-xs text-indigo-600 truncate flex-1">
                        {getVotingLink(selectedTeamsForLink)}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(getVotingLink(selectedTeamsForLink))}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Scoring Preview:</p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                      <p className="font-bold text-indigo-600 mb-1">Voting for {selectedTeamsForLink.length} team(s)</p>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score</span>
                        <span className="text-gray-400">0-100 pts</span>
                      </div>
                    </div>
                  </div>

                  <a 
                    href={getVotingLink(selectedTeamsForLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Link className="w-4 h-4" />
                    Open Voter Page
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Edit Team</h3>
              <button onClick={() => setEditingTeam(null)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEditTeamSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Manual Points</label>
                  <input
                    type="number"
                    value={editTeamPoints}
                    onChange={(e) => setEditTeamPoints(parseInt(e.target.value) || 0)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeam(null);
                      setEditingVoteId(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Submitted Votes</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {votes.filter(v => v.team_id === editingTeam.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No votes submitted yet.</p>
                  ) : (
                    votes.filter(v => v.team_id === editingTeam.id).map(vote => (
                      <div key={vote.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                        {editingVoteId === vote.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-sm text-gray-700 truncate flex-1">{vote.voter_name}</span>
                            <input 
                              type="number" 
                              value={editVoteScore} 
                              onChange={(e) => setEditVoteScore(parseInt(e.target.value) || 0)}
                              className="w-20 p-1 text-sm border rounded focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button type="button" onClick={() => handleSaveVoteEdit(vote.id)} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setEditingVoteId(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded">
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{vote.voter_name}</span>
                              <span className="text-sm text-gray-500">{vote.total_score} pts</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button type="button" onClick={() => { setEditingVoteId(vote.id); setEditVoteScore(vote.total_score); }} className="p-1 text-gray-400 hover:text-indigo-600">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {deletingVoteId === vote.id ? (
                                <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-100">
                                  <button type="button" onClick={() => handleDeleteVote(vote.id)} className="text-xs font-medium text-red-600 hover:text-red-700 px-1">Yes</button>
                                  <button type="button" onClick={() => setDeletingVoteId(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700 px-1">No</button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => setDeletingVoteId(vote.id)} className="p-1 text-gray-400 hover:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
