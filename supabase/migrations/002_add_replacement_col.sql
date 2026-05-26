-- Add replacement_professor_id to medical_licenses
ALTER TABLE medical_licenses 
ADD COLUMN replacement_professor_id UUID REFERENCES professors(id);

-- Index for faster lookups
CREATE INDEX idx_licenses_replacement_id ON medical_licenses(replacement_professor_id);
