import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = ""
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7; // Total visible page buttons
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination with ellipsis
      const startPages = [1, 2];
      const endPages = [totalPages - 1, totalPages];
      
      let middleStart = Math.max(3, currentPage - 1);
      let middleEnd = Math.min(totalPages - 2, currentPage + 1);
      
      // Adjust if current page is near start
      if (currentPage <= 4) {
        middleStart = 3;
        middleEnd = Math.min(5, totalPages - 2);
      }
      
      // Adjust if current page is near end
      if (currentPage >= totalPages - 3) {
        middleStart = Math.max(totalPages - 4, 3);
        middleEnd = totalPages - 2;
      }
      
      // Add start pages
      startPages.forEach(page => {
        if (page <= totalPages) pages.push(page);
      });
      
      // Add ellipsis before middle if needed
      if (middleStart > 3) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = middleStart; i <= middleEnd; i++) {
        if (i > 2 && i < totalPages - 1) {
          pages.push(i);
        }
      }
      
      // Add ellipsis after middle if needed
      if (middleEnd < totalPages - 2) {
        pages.push('...');
      }
      
      // Add end pages
      endPages.forEach(page => {
        if (page > 2 && !pages.includes(page)) {
          pages.push(page);
        }
      });
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-xl border-2 border-gray-200 hover:border-luxury-purple-300 hover:bg-luxury-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1 mx-2">
          {pageNumbers.map((page, index) => (
            page === '...' ? (
              <div key={`ellipsis-${index}`} className="px-2 py-1">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={`rounded-xl min-w-[40px] h-10 transition-all duration-200 shadow-sm ${
                  currentPage === page
                    ? 'bg-luxury-purple-600 text-white border-2 border-luxury-purple-600 hover:bg-luxury-purple-700 hover:shadow-lg transform hover:scale-105'
                    : 'border-2 border-gray-200 hover:border-luxury-purple-300 hover:bg-luxury-purple-50 hover:shadow-md transform hover:scale-105'
                }`}
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-xl border-2 border-gray-200 hover:border-luxury-purple-300 hover:bg-luxury-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
