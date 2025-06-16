import { Link } from "react-router-dom"
import { useVoting } from "../context/VotingContext"
import { Vote, Shield, CheckCircle, Globe } from "lucide-react"

function LandingPage() {
  const { isConnected, isAdmin } = useVoting()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <Vote className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Secure Digital Voting</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Experience the future of democratic participation with our blockchain-powered voting system. Transparent,
              secure, and accessible to all citizens.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!isConnected ? (
              <>
                <Link
                  to="/login"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Start Voting
                </Link>
                <Link
                  to="/results"
                  className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  View Results
                </Link>
              </>
            ) : (
              <>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Go to Dashboard
                  </Link>
                )}
                <Link
                  to="/results"
                  className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  View Results
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose SecureVote?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built with cutting-edge blockchain technology to ensure every vote counts and democracy thrives.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Unbreakable Security</h3>
              <p className="text-gray-600">
                Powered by Ethereum blockchain with military-grade encryption. Your vote is protected by cryptographic
                security.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Transparent Process</h3>
              <p className="text-gray-600">
                Every vote is recorded on the blockchain. Results are publicly verifiable and tamper-proof.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Accessible Anywhere</h3>
              <p className="text-gray-600">
                Vote from anywhere with an internet connection. Mobile-friendly interface for maximum accessibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and straightforward voting process designed for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Register</h3>
              <p className="text-gray-600">Connect your wallet and register with your voter ID</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify</h3>
              <p className="text-gray-600">Wait for Electoral Commission verification</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Vote</h3>
              <p className="text-gray-600">Cast your secure vote for your preferred candidate</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Results</h3>
              <p className="text-gray-600">View real-time, transparent election results</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">Trusted by Democracy</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-blue-100">Secure Transactions</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0</div>
              <div className="text-blue-100">Security Breaches</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">System Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Make Your Voice Heard?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of citizens who trust SecureVote for transparent, secure democratic participation.
          </p>

          {!isConnected && (
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Vote className="h-5 w-5 mr-2" />
              Get Started Now
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}

export default LandingPage
