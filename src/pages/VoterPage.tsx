import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, AlertCircle, Loader2, Users, Star } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

export default function VoterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [voterName, setVoterName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

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
        // Initialize scores
        const initialScores: Record<string, number> = {};
        cats.forEach((cat: string) => {
          initialScores[cat] = 0;
        });
        setScores(prev => ({ ...initialScores, ...prev }));
      } else {
        setCategories([]);
      }
    });

    return () => {
      unsubTeams();
      unsubConfig();
    };
  }, []);

  const handleScoreChange = (category: string, value: string) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    
    setScores(prev => ({
      ...prev,
      [category]: num
    }));
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!selectedTeam) {
      setError('Please select a team to vote for.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Calculate total score
      const totalScore = Object.values(scores).reduce((sum: number, score: number) => sum + score, 0);

      await addDoc(collection(db, 'votes'), {
        team_id: selectedTeam,
        voter_name: voterName.trim(),
        scores: scores,
        total_score: totalScore,
        created_at: serverTimestamp()
      });

      setSuccess(`Vote received! Thank you, ${voterName.trim()}.`);
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
    setSelectedTeam(null);
    const initialScores: Record<string, number> = {};
    categories.forEach((cat: string) => {
      initialScores[cat] = 0;
    });
    setScores(initialScores);
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
                Select Team
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-4 border-2 border-dashed rounded-xl">
                    No teams available.
                  </div>
                ) : (
                  teams.map((team) => (
                    <button
                      type="button"
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedTeam === team.id
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedTeam === team.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <span className={`text-lg font-medium ${selectedTeam === team.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {team.name}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Scoring Categories */}
            {categories.length > 0 && selectedTeam && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Scores (0 - 100)
                </label>
                <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
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
                          value={scores[category] === 0 ? '' : scores[category]}
                          onChange={(e) => handleScoreChange(category, e.target.value)}
                          className="block w-full text-center text-xl font-bold p-3 border-2 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total Score:</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {Object.values(scores).reduce((sum: number, score: number) => sum + score, 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedTeam || !voterName.trim()}
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Vote'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
