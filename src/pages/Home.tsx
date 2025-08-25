import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Star, Users, Image as ImageIcon } from 'lucide-react';
import { AnnouncementsSection } from '@/components/AnnouncementSection';

import axios from 'axios';

// Define the Artifact interface to match the data structure from your API
interface Artifact {
  _id: string;
  title: string;
  artist: string;
  period: string;
  imageUrl?: string;
  images?: { baseimageurl: string }[];
  averageRating: number;
}


export default function Home() {
  const [featuredArtifacts, setFeaturedArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopRatedArtifacts = async () => {
      try {
        const response = await axios.get<Artifact[]>(
          'http://localhost:8080/api/artifacts/top-rated'
        );
        setFeaturedArtifacts(response.data);
      } catch (err) {
        console.error("Failed to fetch top-rated artifacts:", err);
        setError("Failed to load featured artifacts. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopRatedArtifacts();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?q=80&w=2071&auto=format&fit=crop')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-brown-dark/90 via-brown-medium/80 to-brown-light/85"></div>

        <div className="relative container mx-auto px-4 text-center">
          <Badge className="mb-6 bg-warm-white/20 text-warm-white border-warm-white/30">
            Historical Archive Collection
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold text-warm-white mb-6 leading-tight">
            Discover the Beauty of
            <span className="block text-warm-white/90">Historical Art</span>
          </h1>

          <p className="text-xl text-warm-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Explore our curated collection of 60 remarkable artworks spanning
            centuries of human creativity. Rate, save, and immerse yourself in
            the stories behind each masterpiece.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-brown-medium hover:bg-brown-medium/90 text-warm-white border-0 shadow-elegant"
            >
              <Link to="/gallery">
                Explore Gallery
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="border-2 border-warm-white text-warm-white hover:bg-warm-white hover:text-brown-dark"
            >
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">60+</h3>
              <p className="text-muted-foreground">Curated Artifacts</p>
            </div>

            <div className="space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">1000+</h3>
              <p className="text-muted-foreground">Active Users</p>
            </div>

            <div className="space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">5000+</h3>
              <p className="text-muted-foreground">Ratings Given</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Artifacts Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Top-Rated Artifacts
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover some of the most beloved pieces in our collection,
              carefully selected based on community ratings.
            </p>
          </div>

          {isLoading && <p className="text-center">Loading featured artifacts...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {!isLoading && !error && featuredArtifacts.length === 0 && (
                <p className="text-center col-span-full text-muted-foreground">
                    No featured artifacts found at this time.
                </p>
            )}
            {/* Map over the fetched artifacts, displaying only the top 3 */}
            {featuredArtifacts.slice(0, 3).map((artifact) => (
              <Card
                key={artifact._id}
                className="group overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-2"
              >
                
                <div className="relative aspect-[3/4] overflow-hidden">
<img
  src={
    artifact.imageUrl?.trim()
    || artifact.images?.[0]?.baseimageurl?.trim()
    || '/default-artifact.png'
  }

  alt={artifact.title}
  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
/>

                  
                  
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Badge className="absolute top-4 left-4 bg-primary/90">
                    {artifact.period}
                  </Badge>
                  
                </div>

                <CardContent className="p-6">
                  <h3 className="font-semibold text-xl text-foreground mb-2">
                    {artifact.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    by {artifact.artist}
                  </p>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(artifact.averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">
                      {artifact.averageRating.toFixed(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" asChild>
              <Link to="/gallery">
                View All Artifacts
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Announcements */}
      <AnnouncementsSection />

      {/* Call to Action */}
      <section className="py-20 bg-gradient-rich text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join Our Community
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Create an account to rate artworks, save your favorites, and connect
            with fellow art enthusiasts. Upgrade to curator status to share your
            own historical pieces.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">Sign Up Today</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              asChild
            >
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}