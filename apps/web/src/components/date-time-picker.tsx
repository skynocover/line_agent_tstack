import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Form, FormField, FormItem } from './ui/form';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const FormSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export interface DateTimePickerProps {
  onDateTimeChange?: (startTime: string, endTime: string) => void;
  initialStartTime?: string;
  initialEndTime?: string;
  className?: string;
}

export function DateTimePicker({
  onDateTimeChange,
  initialStartTime = '09:00',
  initialEndTime = '10:00',
  className = '',
}: DateTimePickerProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      startTime: initialStartTime,
      endTime: initialEndTime,
    },
  });

  const handleTimeChange = () => {
    const values = form.getValues();
    onDateTimeChange?.(values.startTime || '', values.endTime || '');
  };

  return (
    <Form {...form}>
      <form className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleTimeChange();
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {Array.from({ length: 96 }).map((_, i) => {
                        const hour = Math.floor(i / 4)
                          .toString()
                          .padStart(2, '0');
                        const minute = ((i % 4) * 15).toString().padStart(2, '0');
                        return (
                          <SelectItem key={i} value={`${hour}:${minute}`}>
                            {hour}:{minute}
                          </SelectItem>
                        );
                      })}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <div className="flex items-center justify-center">~</div>

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleTimeChange();
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {Array.from({ length: 96 }).map((_, i) => {
                        const hour = Math.floor(i / 4)
                          .toString()
                          .padStart(2, '0');
                        const minute = ((i % 4) * 15).toString().padStart(2, '0');
                        return (
                          <SelectItem key={i} value={`${hour}:${minute}`}>
                            {hour}:{minute}
                          </SelectItem>
                        );
                      })}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
