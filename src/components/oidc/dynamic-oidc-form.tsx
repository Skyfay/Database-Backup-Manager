import { OIDCInput } from "@/lib/core/oidc-adapter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DynamicOidcFormProps {
    inputs: OIDCInput[];
    value: Record<string, any>;
    onChange: (key: string, val: string) => void;
    disabled?: boolean;
}

export function DynamicOidcForm({ inputs, value, onChange, disabled }: DynamicOidcFormProps) {
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    const togglePassword = (key: string) => {
        setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-4">
            {inputs.map((input) => (
                <div key={input.name} className="space-y-2">
                    <Label htmlFor={input.name}>
                        {input.label} {input.required && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="relative">
                        <Input
                            id={input.name}
                            type={
                                input.type === "password"
                                    ? (showPasswords[input.name] ? "text" : "password")
                                    : input.type
                            }
                            placeholder={input.placeholder}
                            value={value[input.name] || ""}
                            onChange={(e) => onChange(input.name, e.target.value)}
                            disabled={disabled}
                            required={input.required}
                        />
                         {input.type === "password" && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => togglePassword(input.name)}
                            >
                                {showPasswords[input.name] ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </div>
                    {input.description && (
                        <p className="text-sm text-muted-foreground">{input.description}</p>
                    )}
                </div>
            ))}
        </div>
    );
}
