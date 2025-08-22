import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Eye, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthGuard } from '@/hooks/useAuthGuard'; 
import {
  listMyArtworks,
  deleteArtifact,
  MyArtworkDTO,
  PageResponse
} from '@/services/api';

type AppStatus = "pending" | "accepted" | "rejected";

export const ManageArtworks = () => {
  const { user, ready } = useAuthGuard();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user?.role !== "curator") {
      navigate("/403");
    }
  }, [ready, user, navigate]);

  const [artworks, setArtworks] = useState<MyArtworkDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppStatus>('all');

  const getBestImageUrl = (a: MyArtworkDTO): string => {
    const fromImageUrl = a.image_url?.trim();
    const fromImages = a.images?.[0]?.baseimageurl?.trim();
    return fromImageUrl || fromImages || '/placeholder-art.jpg';
  };

  const getStatusColor = (status: AppStatus) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        const res: PageResponse<MyArtworkDTO> = await listMyArtworks(0, 100);
        const normalized = (res.content || []).map(raw => {
          const image_url =
            (raw.image_url && String(raw.image_url).trim()) ||
            (raw.images?.[0]?.baseimageurl && String(raw.images[0].baseimageurl).trim()) ||
            '';
          return { ...raw, image_url };
        });
        setArtworks(normalized);
      } catch (err: any) {
        console.error('Failed to fetch artworks:', err);
        if (err?.response?.status === 401) {
          setError('You must be logged in as a curator to view your artworks.');
        } else {
          setError('Failed to fetch artworks. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchArtworks();
  }, []);

  const filteredArtworks = artworks.filter((artwork) => {
    const matchesSearch = artwork.title.toLowerCase().includes(searchTerm.toLowerCase());
    const status = (artwork.status?.toLowerCase() || 'pending') as AppStatus;
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (id: string) => navigate(`/curator/artworks/edit/${id}`);
  const handleView = (id: string) => navigate(`/artwork/${id}`);
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) return;

    try {
      await deleteArtifact(id);
      setArtworks(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error('Failed to delete artwork:', err);
      setError('Failed to delete artwork. Please try again.');
    }
  };

  if (loading) return <div className="p-6 text-center text-lg">Loading artworks...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Artworks</h1>
          <p className="text-muted-foreground mt-2">
            Manage your uploaded artworks, edit details, and track performance
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Artworks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{artworks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {artworks.filter(a => a.status === "accepted").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {artworks.filter(a => a.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {artworks.filter(a => a.status === "rejected").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Search */}
      <Card>
        <CardHeader>
          <CardTitle>Your Artworks</CardTitle>
          <CardDescription>View and manage all your uploaded artworks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search artworks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artwork</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Avg. Rating</TableHead>
                  <TableHead>Total Ratings</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtworks.length > 0 ? (
                  filteredArtworks.map((art) => {
                    const status = (art.status?.toLowerCase() || 'pending') as AppStatus;
                    const dateStr = art.uploaded_at ? new Date(art.uploaded_at).toLocaleDateString() : '—';
                    return (
                      <TableRow key={art._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={getBestImageUrl(art)}
                              alt={art.title}
                              className="w-12 h-12 rounded-md object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-art.jpg'; }}
                            />
                          </div>
                        </TableCell>
                        <TableCell><div className="font-medium text-foreground">{art.title}</div></TableCell>
                        <TableCell>{art.category ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{(art.averageRating ?? 0).toFixed(1)}</TableCell>
                        <TableCell>{art.totalRatings ?? 0}</TableCell>
                        <TableCell>{dateStr}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleView(art._id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(art._id)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(art._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No artworks found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
