import { useState, useEffect } from "react";
import { CalendarIcon, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AutocompleteInput } from "./AutocompleteInput";
import { cn } from "@/lib/utils";
import {
  fetchCategorySuggestions,
  fetchCultureSuggestions,
  fetchDepartmentSuggestions,
  fetchPeriodSuggestions,
} from "@/services/api";

interface AdvancedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  anyField?: string;
  title?: string;
  category?: string;
  culture?: string;
  department?: string;
  period?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
}

export function AdvancedSearchDialog({
  open,
  onOpenChange,
  onSearch,
}: AdvancedSearchDialogProps) {
  const [anyField, setAnyField] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [culture, setCulture] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [sortBy, setSortBy] = useState("best_match");

  // State for suggestions from database
  const [categories, setCategories] = useState<string[]>([]);
  const [cultures, setCultures] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const sortOptions = [
    { value: "best_match", label: "Best Match" },
    { value: "ascending", label: "Ascending" },
    { value: "descending", label: "Descending" },
    { value: "most_few", label: "Most Favorite" },
    { value: "least_few", label: "Least Favorite" },
  ];

  // Fetch suggestions from database when dialog opens
  useEffect(() => {
    if (open && categories.length === 0) {
      // Only fetch if not already loaded
      loadSuggestions();
    }
  }, [open, categories.length]);

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const [categoriesData, culturesData, departmentsData, periodsData] =
        await Promise.all([
          fetchCategorySuggestions(),
          fetchCultureSuggestions(),
          fetchDepartmentSuggestions(),
          fetchPeriodSuggestions(),
        ]);

      // Filter out null/undefined values and sort alphabetically
      setCategories(categoriesData.filter(Boolean).sort());
      setCultures(culturesData.filter(Boolean).sort());
      setDepartments(departmentsData.filter(Boolean).sort());
      setPeriods(periodsData.filter(Boolean).sort());
    } catch (error) {
      console.error("Error loading suggestions:", error);
      // Fallback to empty arrays if API fails
      setCategories([]);
      setCultures([]);
      setDepartments([]);
      setPeriods([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearch = () => {
    const filters: SearchFilters = {
      anyField,
      title,
      category,
      culture,
      department,
      period,
      fromDate: fromDate ? fromDate.toISOString().split("T")[0] : undefined,
      toDate: toDate ? toDate.toISOString().split("T")[0] : undefined,
      sortBy,
    };
    onSearch(filters);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setAnyField("");
    setTitle("");
    setCategory("");
    setCulture("");
    setDepartment("");
    setPeriod("");
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy("best_match");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader />

        <div className="space-y-6">
          {/* Loading indicator for suggestions */}
          {isLoadingSuggestions && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Loading suggestions...
              </span>
            </div>
          )}

          {/* Any Field Search */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Any Field Search</h3>
            <div className="space-y-2">
              <Label htmlFor="anyField">Search all fields</Label>
              <Input
                id="anyField"
                value={anyField}
                onChange={(e) => setAnyField(e.target.value)}
                placeholder="Enter search term"
              />
            </div>
          </div>

          {/* Detail Search */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Detail Search</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <AutocompleteInput
                  id="category"
                  value={category}
                  onChange={setCategory}
                  suggestions={categories}
                  disabled={isLoadingSuggestions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="culture">Culture</Label>
                <AutocompleteInput
                  id="culture"
                  value={culture}
                  onChange={setCulture}
                  suggestions={cultures}
                  disabled={isLoadingSuggestions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <AutocompleteInput
                  id="department"
                  value={department}
                  onChange={setDepartment}
                  suggestions={departments}
                  disabled={isLoadingSuggestions}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="period">Period</Label>
                <AutocompleteInput
                  id="period"
                  value={period}
                  onChange={setPeriod}
                  suggestions={periods}
                  disabled={isLoadingSuggestions}
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "Calendar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "Calendar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Sort By</h3>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSearch}
              className="flex-1"
              disabled={isLoadingSuggestions}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={isLoadingSuggestions}
            >
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
