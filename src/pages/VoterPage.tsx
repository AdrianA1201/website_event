import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, AlertCircle, Loader2, User, Users } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface Registration {
  id: string;
  barcode_id: string;
  name: string;
}

export default function VoterPage() {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [voter, setVoter] = useState<Registration | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep input focused for barcode scanners
    inputRef.current?.focus();

    const qTeams = query(collection(db, 'teams'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      const t: Team[] = [];
      snapshot.forEach((doc) => {
        t.push({ ...doc.data() as Team, id: doc.id });
      });
      setTeams(t);
    });

    return () => unsubTeams();
  }, []);

  const handleVerifyBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setVoter(null);
    setSelectedTeam(null);

    try {
      // 1. Check if barcode exists
      const qReg = query(collection(db, 'registrations'), where('barcode_id', '==', barcode.trim()));
      const regSnapshot = await getDocs(qReg);

      if (regSnapshot.empty) {
        setError('Invalid barcode. Attendee not found.');
        setBarcode('');
        inputRef.current?.focus();
        setLoading(false);
        return;
      }

      const attendee = { ...regSnapshot.docs[0].data(), id: regSnapshot.docs[0].id } as Registration;

      // 2. Check if already voted
      const qVote = query(collection(db, 'votes'), where('barcode_id', '==', attendee.barcode_id));
      const voteSnapshot = await getDocs(qVote);

      if (!voteSnapshot.empty) {
        setError(`Attendee ${attendee.name} has already voted!`);
        setBarcode('');
        inputRef.current?.focus();
        setLoading(false);
        return;
      }

      // 3. Valid voter
      setVoter(attendee);
    } catch (err) {
      console.error('Error verifying barcode:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!voter || !selectedTeam) return;

    setLoading(true);
    setError('');

    try {
      // Double check they haven't voted in the meantime
      const qVote = query(collection(db, 'votes'), where('barcode_id', '==', voter.barcode_id));
      const voteSnapshot = await getDocs(qVote);

      if (!voteSnapshot.empty) {
        setError(`Attendee ${voter.name} has already voted!`);
        resetForm();
        return;
      }

      await addDoc(collection(db, 'votes'), {
        team_id: selectedTeam,
        barcode_id: voter.barcode_id,
        created_at: serverTimestamp()
      });

      setSuccess(`Vote cast successfully for ${voter.name}!`);
      resetForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Error casting vote:', err);
      setError('Failed to cast vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setVoter(null);
    setBarcode('');
    setSelectedTeam(null);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <h1 className="text-3xl font-bold mb-2">Cast Your Vote</h1>
          <p className="text-indigo-100">Scan your barcode to begin</p>
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

          {!voter ? (
            <form onSubmit={handleVerifyBarcode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendee Barcode
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="block w-full text-center text-2xl tracking-widest p-4 border-2 border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Scan or type barcode"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !barcode.trim()}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify Attendee'}
              </button>
            </form>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-center gap-3 p-4 bg-indigo-50 rounded-xl text-indigo-900">
                <User className="w-6 h-6" />
                <span className="text-lg font-medium">Welcome, {voter.name}!</span>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">Select a Team</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-4">No teams available.</div>
                  ) : (
                    teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team.id)}
                        className={`p-6 rounded-xl border-2 text-left transition-all ${
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

              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={resetForm}
                  className="flex-1 py-4 px-4 border border-gray-300 rounded-xl shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVote}
                  disabled={loading || !selectedTeam}
                  className="flex-1 flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Vote'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
