import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getArtifactById, updateArtifact, ArtifactDetail } from '@/services/api';
import { useAuthGuard } from '@/hooks/useAuthGuard'; 
import { useAuth } from '@/hooks/useAuth'; 
type FormValues = {
  title: string;
  category: string;
  description: string;
  culture: string;
  department: string;
  period: string;
  medium: string;
  dimension: string;
  image_url: string;
};

export const EditArtwork = () => {
  useAuthGuard();

  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
    watch,
  } = useForm<FormValues>();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const data = await getArtifactById(id);
        reset({
          title: data.title ?? '',
          category: data.category ?? '',
          description: data.description ?? '',
          culture: data.culture ?? '',
          department: data.department ?? '',
          period: data.period ?? '',
          medium: data.medium ?? '',
          dimension: data.dimension ?? '',
          image_url: data.image_url ?? (data.images?.[0]?.baseimageurl ?? ''),
        });
      } catch (err) {
        console.error('Failed to fetch artwork:', err);
        toast({
          title: 'Error',
          description: 'Failed to fetch artwork details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, reset, toast]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    // tiny client-side check
    if (!values.title.trim() || !values.category.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Title and Category are required.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await updateArtifact(id, values);
      toast({ title: 'Success', description: 'Artwork updated successfully' });
      navigate('/curator/artworks');
    } catch (err) {
      console.error('Failed to update artwork:', err);
      toast({
        title: 'Error',
        description: 'Failed to update artwork',
        variant: 'destructive',
      });
    }
  };

  

  const imagePreview = useMemo(() => {
    const val = watch('image_url');
    return val?.trim() || '';
  }, [watch]);

  if (loading) {
    return <div className="p-6 text-center text-lg">Loading artwork details...</div>;
  }



const { user, ready } = useAuthGuard();


useEffect(() => {
  if (ready && user.role === "visitor") {
    navigate("/403");
  }
}, [ready, user, navigate]);



  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Artwork</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Thumbnail Preview */}
            {imagePreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Artwork"
                  className="w-24 h-24 rounded-md object-cover border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-art.jpg'; }}
                />
                <span className="text-sm text-muted-foreground">Preview</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register('title')} placeholder="e.g., Starry Night" />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Input id="category" {...register('category')} placeholder="e.g., Painting" />
              </div>
              <div>
                <Label htmlFor="culture">Culture</Label>
                <Input id="culture" {...register('culture')} placeholder="e.g., Dutch" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" {...register('department')} placeholder="e.g., European Art" />
              </div>
              <div>
                <Label htmlFor="period">Period</Label>
                <Input id="period" {...register('period')} placeholder="e.g., Post-Impressionism" />
              </div>
              <div>
                <Label htmlFor="medium">Medium</Label>
                <Input id="medium" {...register('medium')} placeholder="e.g., Oil on canvas" />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} {...register('description')} placeholder="Write a short description..." />
              </div>

              <div>
                <Label htmlFor="dimension">Dimensions</Label>
                <Input id="dimension" {...register('dimension')} placeholder="e.g., 24 × 36 in" />
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" {...register('image_url')} placeholder="https://..." />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/curator/artworks')} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
