-- Create income_subcategories table
CREATE TABLE public.income_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.income_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.income_subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own income subcategories" 
ON public.income_subcategories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income subcategories" 
ON public.income_subcategories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income subcategories" 
ON public.income_subcategories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income subcategories" 
ON public.income_subcategories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_income_subcategories_updated_at
BEFORE UPDATE ON public.income_subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add subcategory_id to incomes table
ALTER TABLE public.incomes 
ADD COLUMN subcategory_id UUID REFERENCES public.income_subcategories(id) ON DELETE SET NULL;