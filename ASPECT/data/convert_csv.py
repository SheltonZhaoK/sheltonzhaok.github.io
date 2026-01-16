import csv
import json

# Short key mapping including drug columns
key_map = {
    'cancer_type': 'ct',
    'trial_id': 'tid',
    'rule': 'r',
    'rule_section': 'rs',
    'overall_frequency': 'of',
    'n_trials': 'nt',
    'enrollment_mean': 'em',
    'enrollment_std': 'es',
    'site_mean': 'sm',
    'site_std': 'ss',
    'recruitment_months_mean': 'rm',
    'recruitment_months_std': 'rms',
    'epsm_mean': 'epm',
    'epsm_std': 'eps',
    'start_date_mean': 'sd',
    'start_date_std_yrs': 'sds',
    'Overall': 'O',
    'White': 'W',
    'Asian': 'A',
    'African-American': 'AA',
    'Female': 'F',
    'Male': 'M',
    '18-50': 'a1',
    '50-65': 'a2',
    '>65': 'a3',
    'cluster_id': 'cid',
    'cluster_center_rule': 'ccr',
    'Drug: Chemotherapy': 'dCh',
    'Drug: Targeted Therapy': 'dTa',
    'Drug: Immunotherapy / Biological Therapy': 'dIm',
    'Drug: Hormonal Therapy': 'dHo',
    'Drug: Photodynamic Therapy': 'dPh',
    'Drug: Supportive Care': 'dSu',
    'Drug: Placebo': 'dPl'
}

data = []
with open('/mnt/user-data/uploads/merged_rule_level_summary_final.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        new_row = {}
        for k, v in row.items():
            short_key = key_map.get(k, k)
            # Round numeric values
            try:
                num = float(v)
                if num == int(num):
                    new_row[short_key] = int(num)
                else:
                    new_row[short_key] = round(num, 2)
            except:
                new_row[short_key] = v
        data.append(new_row)

with open('/home/claude/website/data/rules.json', 'w') as f:
    json.dump(data, f, separators=(',', ':'))