import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Create and Play Quizzes in Real Time
          </h1>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            QuizMaster — an interactive quiz platform. Create a quiz in minutes,
            invite participants with a room code, and watch results in real time.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <>
                {user.role === 'organizer' && (
                  <Link to="/quiz/create" className="bg-white text-primary-700 px-8 py-3 rounded-lg font-bold text-lg hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl">
                    Create Quiz
                  </Link>
                )}
                <Link to="/join" className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white/10 transition-all">
                  Join Quiz
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="bg-white text-primary-700 px-8 py-3 rounded-lg font-bold text-lg hover:bg-primary-50 transition-all shadow-lg">
                  Get Started Free
                </Link>
                <Link to="/login" className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white/10 transition-all">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '📝', title: 'Question Types', desc: 'Text and image questions, single and multiple choice.' },
            { icon: '⚡', title: 'Real Time', desc: 'Questions display synchronously for all participants. Answers accepted only during display.' },
            { icon: '🏆', title: 'Instant Results', desc: 'Automatic scoring and leaderboard after each question and at the end.' },
            { icon: '🔑', title: 'Room Code', desc: 'Participants join with a 6-digit code. No links or complicated invitations.' },
            { icon: '📊', title: 'Statistics', desc: 'History of participations and hosted quizzes in your personal account.' },
            { icon: '🎨', title: 'Modern Design', desc: 'Responsive interface, comfortable on any device.' },
          ].map((f, i) => (
            <div key={i} className="card text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create Quiz', desc: 'Add questions and configure settings' },
              { step: '2', title: 'Launch Session', desc: 'Get a room code for participants' },
              { step: '3', title: 'Invite Players', desc: 'Participants enter the code and join' },
              { step: '4', title: 'View Results', desc: 'Automatic scoring and leaderboard' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
