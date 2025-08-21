import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, Star, Award } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-primary/10 text-primary">About Our Mission</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Preserving History Through Art
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Historical Archive is dedicated to preserving and sharing the world's most significant 
            artworks and historical artifacts. Our platform connects art enthusiasts, curators, 
            and scholars in a collaborative effort to celebrate human creativity across centuries.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <Card className="bg-gradient-warm p-8">
            <CardContent className="p-0">
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To democratize access to historical art by creating a comprehensive digital archive 
                that allows people worldwide to discover, appreciate, and learn from humanity's 
                greatest artistic achievements. We believe that art is a universal language that 
                transcends time and borders.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card p-8 shadow-soft">
            <CardContent className="p-0">
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                To become the world's leading platform for historical art education and appreciation, 
                fostering a global community of art lovers who actively participate in preserving 
                and sharing cultural heritage for future generations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            What Makes Us Special
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Curated Collection</h3>
              <p className="text-muted-foreground">
                Every artwork in our collection is carefully selected by art historians and experts 
                for its historical significance and artistic merit.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Community Ratings</h3>
              <p className="text-muted-foreground">
                Engage with artworks through our 5-star rating system and discover what resonates 
                with fellow art enthusiasts from around the world.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Expert Community</h3>
              <p className="text-muted-foreground">
                Join curators, professors, and art historians in meaningful discussions about 
                technique, history, and cultural context.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Educational Focus</h3>
              <p className="text-muted-foreground">
                Each artwork comes with detailed historical context, helping you understand 
                the story behind every masterpiece.
              </p>
            </div>
          </div>
        </div>

        {/* User Roles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Join Our Community
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Visitors</h3>
                <p className="text-sm text-muted-foreground">
                  Explore, rate, and save artworks. Build your personal collection of favorites.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Curators</h3>
                <p className="text-sm text-muted-foreground">
                  Upload and share historical artworks. Engage in scholarly discussions.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Professors</h3>
                <p className="text-sm text-muted-foreground">
                  Review and approve curator submissions. Maintain quality standards.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Admins</h3>
                <p className="text-sm text-muted-foreground">
                  Manage the platform, users, and overall community standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-rich p-12 rounded-lg text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">Ready to Begin Your Journey?</h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of art enthusiasts in exploring and preserving history's greatest masterpieces.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium bg-primary-foreground text-primary rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Start Exploring
            </a>
            <a
              href="/gallery"
              className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium border-2 border-primary-foreground text-primary-foreground rounded-lg hover:bg-primary-foreground hover:text-primary transition-colors"
            >
              View Gallery
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}