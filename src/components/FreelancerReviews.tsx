import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Star, MessageSquarePlus } from 'lucide-react';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface FreelancerReviewsProps {
  reviews: Review[];
  canReview: boolean;
  onAddReview: (rating: number, comment: string) => Promise<void>;
}

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  const active = hovered || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHovered(i)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sz} transition-all duration-150 ${i <= active
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function FreelancerReviews({ reviews, canReview, onAddReview }: FreelancerReviewsProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const avg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    await onAddReview(rating, comment);
    setSaving(false);
    setComment('');
    setRating(5);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Aggregate */}
      <div className="flex flex-col md:flex-row items-center gap-8 p-6 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/5 rounded-2xl border border-amber-100 dark:border-amber-900/20">
        <div className="text-center">
          <p className="text-6xl font-black text-amber-500">{avg.toFixed(1)}</p>
          <StarRating value={Math.round(avg)} size="md" />
          <p className="text-sm text-muted-foreground mt-2">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
        </div>
        <div className="flex-1 w-full space-y-2">
          {distribution.map(d => (
            <div key={d.star} className="flex items-center gap-3">
              <span className="text-sm w-4 text-muted-foreground">{d.star}</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${d.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                />
              </div>
              <span className="text-sm text-muted-foreground w-6">{d.count}</span>
            </div>
          ))}
        </div>

        {canReview && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90 gap-2 shrink-0">
                <MessageSquarePlus className="w-4 h-4" /> Leave a Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Write a Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Rating</Label>
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
                <div className="space-y-2">
                  <Label>Your Review</Label>
                  <Textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share your experience working with this freelancer..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={saving || !comment.trim()}
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                >
                  {saving ? 'Submitting…' : 'Submit Review'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <Star className="w-14 h-14 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {reviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border border-border hover:border-amber-200 dark:hover:border-amber-900/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-10 h-10 border-2 border-amber-100">
                        <AvatarImage src={review.reviewer_avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                          {review.reviewer_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold">{review.reviewer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StarRating value={review.rating} size="sm" />
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
