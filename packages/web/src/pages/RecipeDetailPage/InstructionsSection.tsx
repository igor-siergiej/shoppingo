import { useState } from 'react';
import { StepsList } from '../../components/StepsList';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { splitIntoSteps } from '../../utils/splitIntoSteps';

interface InstructionsSectionProps {
    instructions?: string[];
    isOwner?: boolean | null;
    onSave: (instructions: string[]) => Promise<void>;
}

// View/edit toggle with a paste-text/step-list sub-toggle for instructions; already delegates
// step rendering to the shared StepsList component, leaving only this view's own state machine.
// fallow-ignore-next-line complexity
export const InstructionsSection = ({ instructions = [], isOwner, onSave }: InstructionsSectionProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [steps, setSteps] = useState<string[]>(instructions);
    const [showPaste, setShowPaste] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(steps);
            setIsEditing(false);
            setShowPaste(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setSteps(instructions);
        setIsEditing(false);
        setShowPaste(false);
        setPasteText('');
    };

    if (!isEditing) {
        return (
            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Instructions</p>
                {instructions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No instructions added yet.</p>
                ) : (
                    <div className="space-y-1">
                        {instructions.map((step, i) => (
                            <div
                                key={`${i}-${step.slice(0, 20)}`}
                                className="flex items-start gap-2 px-3 py-2 rounded-md bg-card border border-border text-sm"
                            >
                                <span className="font-semibold text-muted-foreground min-w-[1.25rem]">{i + 1}.</span>
                                <span className="text-foreground">{step}</span>
                            </div>
                        ))}
                    </div>
                )}
                {isOwner && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSteps(instructions);
                            setIsEditing(true);
                        }}
                    >
                        Edit Instructions
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Instructions</p>
                <button
                    type="button"
                    onClick={() => setShowPaste(!showPaste)}
                    className="text-xs text-muted-foreground underline"
                >
                    {showPaste ? 'back to steps' : 'paste text ↩'}
                </button>
            </div>

            {showPaste ? (
                <Textarea
                    placeholder="Paste instructions here — each line becomes a step automatically..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    onBlur={() => {
                        const parsed = splitIntoSteps(pasteText);
                        if (parsed.length > 0) {
                            setSteps(parsed);
                            setShowPaste(false);
                            setPasteText('');
                        }
                    }}
                    className="min-h-[100px] resize-none"
                />
            ) : (
                <StepsList steps={steps} onChange={setSteps} />
            )}

            <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};
