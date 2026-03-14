import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, AlertCircle, Loader2, Users, Star } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface Team {
  id: string;
  name: string;
}

export default function VoterPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [voterName, setVoterName] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(searchParams.get('teamIds')?.split(',') || []);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [isLocked, setIsLocked] = useState(!!searchParams.get('teamIds'));

  useEffect(() => {
    const qTeams = query(collection(db, 'teams'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      const t: Team[] = [];
      snapshot.forEach((doc) => {
        t.push({ ...doc.data() as Team, id: doc.id });
      });
      setTeams(t);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'voting'), (docSnap) => {
      if (docSnap.exists()) {
        const cats = docSnap.data().categories || [];
        setCategories(cats);
        
        // Initialize scores for all teams if not already set
        setScores(prev => {
          const newScores = { ...prev };
          const teamsToInit = isLocked ? selectedTeamIds : teams.map(t => t.id);
          
          teamsToInit.forEach(teamId => {
            if (!newScores[teamId]) {
              newScores[teamId] = {};
            }
            cats.forEach((cat: string) => {
              if (newScores[teamId][cat] === undefined) {
                newScores[teamId][cat] = 0;
              }
            });
          });
          return newScores;
        });
      } else {
        setCategories([]);
      }
    });

    return () => {
      unsubTeams();
      unsubConfig();
    };
  }, [isLocked, selectedTeamIds.join(','), teams.length]);

  const handleScoreChange = (teamId: string, category: string, value: string) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    
    setScores(prev => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [category]: num
      }
    }));
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (selectedTeamIds.length === 0) {
      setError('Please select at least one team to vote for.');
      return;
    }
    if (categories.length === 0) {
      setError('Voting is not yet configured. Please contact the administrator.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Submit a vote for each selected team
      const votePromises = selectedTeamIds.map(teamId => {
        const teamScores = scores[teamId] || {};
        const totalScore = Object.values(teamScores).reduce((sum: number, score: number) => sum + score, 0);
        
        return addDoc(collection(db, 'votes'), {
          team_id: teamId,
          voter_name: voterName.trim(),
          scores: teamScores,
          total_score: totalScore,
          created_at: serverTimestamp()
        });
      });

      await Promise.all(votePromises);

      setSuccess(`Votes received for ${selectedTeamIds.length} team(s)! Thank you, ${voterName.trim()}.`);
      resetForm();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
      
    } catch (err) {
      console.error('Error casting vote:', err);
      setError('Failed to submit vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setVoterName('');
    if (!isLocked) {
      setSelectedTeamIds([]);
    }
    setScores({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <h1 className="text-3xl font-bold mb-2">Cast Your Vote</h1>
          <p className="text-indigo-100">Score the teams based on the criteria</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p className="font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleVote} className="space-y-8">
            {/* Voter Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                className="block w-full text-lg p-4 border-2 border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your full name"
                disabled={loading}
                required
              />
            </div>

            {/* Team Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                {isLocked ? 'Voting For:' : 'Select Teams to Vote For'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-4 border-2 border-dashed rounded-xl">
                    No teams available.
                  </div>
                ) : (
                  teams
                    .filter(t => !isLocked || selectedTeamIds.includes(t.id))
                    .map((team) => (
                    <button
                      type="button"
                      key={team.id}
                      onClick={() => {
                        if (isLocked) return;
                        setSelectedTeamIds(prev => 
                          prev.includes(team.id) 
                            ? prev.filter(id => id !== team.id)
                            : [...prev, team.id]
                        );
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedTeamIds.includes(team.id)
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      } ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedTeamIds.includes(team.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <span className={`text-lg font-medium ${selectedTeamIds.includes(team.id) ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {team.name}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Scoring Categories for each team */}
            {selectedTeamIds.length > 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {categories.length > 0 ? (
                  selectedTeamIds.map(teamId => {
                    const team = teams.find(t => t.id === teamId);
                    if (!team) return null;
                    const teamScores = scores[teamId] || {};
                    const totalScore = Object.values(teamScores).reduce((sum: number, score: number) => sum + score, 0);

                    return (
                      <div key={teamId} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          {team.name}
                        </h3>
                        <div className="space-y-4">
                          {categories.map((category) => (
                            <div key={category} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-1">
                                <Star className="w-5 h-5 text-yellow-500" />
                                <span className="font-medium text-gray-700">{category}</span>
                              </div>
                              <div className="w-32">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={teamScores[category] === 0 ? '' : teamScores[category]}
                                  onChange={(e) => handleScoreChange(teamId, category, e.target.value)}
                                  className="block w-full text-center text-xl font-bold p-3 border-2 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="0"
                                  required
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                          <span className="font-bold text-gray-900">Team Total:</span>
                          <span className="text-2xl font-bold text-indigo-600">
                            {totalScore}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-center">
                    <p className="font-medium">No scoring categories have been set up yet.</p>
                    <p className="text-sm mt-1">Please wait for the administrator to configure the criteria.</p>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || selectedTeamIds.length === 0 || !voterName.trim()}
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit All Votes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
