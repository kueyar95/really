import { Field } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  label: string;
  hidden?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ id, name, type, placeholder, label, hidden }) => {
  return (
    hidden ? null :
    <div className='flex flex-col w-full gap-2'>
      <Label htmlFor={id} className='text-primary'>{label}</Label>
      <Field
        as={Input}
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
      />
    </div>
  );
};

export default FormField;