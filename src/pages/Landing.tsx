import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Users, Briefcase, MessageSquare, TrendingUp } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const handleGetStarted = () => {
    if (user && userRole) {
      navigate(`/dashboard/${userRole}`);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl animate-pulse delay-75"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-secondary rounded-full blur-3xl animate-pulse delay-150"></div>
        </div>

        <div className="container mx-auto px-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-16 h-16 text-primary mx-auto" style={{ filter: 'drop-shadow(var(--shadow-glow))' }} />
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              Welcome to IdeaBloom
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              The next-generation platform connecting clients, freelancers, and consultants through intelligent collaboration
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--gradient-primary)' }}
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-6 rounded-full border-2 hover:border-primary transition-all duration-300"
              >
                Sign In
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
              {[
                { icon: Users, label: 'Active Users', value: '10K+' },
                { icon: Briefcase, label: 'Projects', value: '5K+' },
                { icon: MessageSquare, label: 'Messages', value: '50K+' },
                { icon: TrendingUp, label: 'Success Rate', value: '98%' }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/50 transition-all duration-300"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <stat.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-5xl font-bold text-center mb-16 bg-clip-text text-transparent"
            style={{ backgroundImage: 'var(--gradient-primary)' }}
          >
            Why Choose IdeaBloom?
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Smart Matching',
                description: 'AI-powered recommendations connect you with the perfect opportunities or talent',
                icon: '🎯'
              },
              {
                title: 'Real-time Collaboration',
                description: 'Seamless communication with integrated chat, file sharing, and progress tracking',
                icon: '🚀'
              },
              {
                title: 'Secure Payments',
                description: 'Protected transactions with milestone-based payment systems',
                icon: '🔒'
              },
              {
                title: 'Expert Consultants',
                description: 'Access to industry-leading consultants for guidance and strategy',
                icon: '👥'
              },
              {
                title: 'Community Hub',
                description: 'Share ideas, collaborate on projects, and grow your network',
                icon: '💡'
              },
              {
                title: 'AI Assistant',
                description: 'Get help with proposals, project descriptions, and smart suggestions',
                icon: '🤖'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card rounded-3xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
