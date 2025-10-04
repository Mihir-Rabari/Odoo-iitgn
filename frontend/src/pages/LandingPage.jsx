import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Zap, Globe, TrendingUp, Users } from 'lucide-react';
import Button from '@/components/ui/Button';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/logo.svg" alt="Expe" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Expe
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent">
            Streamline Your Expense Approvals with Confidence
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Expe helps companies manage expense reimbursements efficiently with multi-level approvals,
            OCR receipt scanning, and real-time currency conversion.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link to="/signup">
              <Button size="lg" className="group">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mt-16 relative">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl shadow-2xl p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-24 bg-gradient-to-r from-purple-100 to-purple-50 rounded"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-16 bg-gray-100 rounded"></div>
                  <div className="h-16 bg-gray-100 rounded"></div>
                  <div className="h-16 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-gray-600">Powerful features to simplify expense management</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-purple-600" />}
            title="Multi-Level Approvals"
            description="Define sequential and conditional approval workflows with percentage-based rules"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-purple-600" />}
            title="OCR Receipt Scanning"
            description="Automatically extract expense details from receipts using advanced OCR technology"
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8 text-purple-600" />}
            title="Multi-Currency Support"
            description="Submit expenses in any currency with real-time conversion to company currency"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-purple-600" />}
            title="Role-Based Access"
            description="Admin, Manager, and Employee roles with specific permissions and workflows"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-purple-600" />}
            title="Real-Time Analytics"
            description="Track expenses, approvals, and spending patterns with detailed reports"
          />
          <FeatureCard
            icon={<CheckCircle className="h-8 w-8 text-purple-600" />}
            title="Email Notifications"
            description="Beautiful email templates keep everyone informed about expense status"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-b from-purple-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, fast, and efficient</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <Step
              number="1"
              title="Submit Expense"
              description="Upload receipt, OCR auto-fills details, or enter manually"
            />
            <Step
              number="2"
              title="Approval Flow"
              description="Automatic routing through manager and custom approval rules"
            />
            <Step
              number="3"
              title="Get Reimbursed"
              description="Track status and receive payment once fully approved"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of companies streamlining their expense management
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img src="/logo.svg" alt="Expe" className="h-8 w-8" />
              <span className="text-xl font-bold">Expe</span>
            </div>
            <p className="text-gray-600">© 2025 Expe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const Step = ({ number, title, description }) => (
  <div className="text-center">
    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingPage;
