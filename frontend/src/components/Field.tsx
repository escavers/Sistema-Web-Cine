interface FieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (name: string, value: string) => void;
}

export default function Field({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  required,
  onChange
}: FieldProps) {
  return (
    <label className="block">
      <span className="label-cine">{label}</span>
      <input
        className="input-cine"
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}
