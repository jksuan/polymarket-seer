import sys
import os

target_file = r"e:\我的文档\大模型\项目源码\polymarket\polymarket-seer\src\components\pages\ProfilePage.tsx"
source_file = r"e:\我的文档\大模型\项目源码\polymarket\polysport-h5\src\app\pages\ProfilePage.tsx"

with open(target_file, "r", encoding="utf-8") as f:
    target_lines = f.readlines()
    
with open(source_file, "r", encoding="utf-8") as f:
    source_lines = f.readlines()

# Extract from source (line 127 to line 820 inclusive (0-based index: 126 to 820))
chunk_to_insert = source_lines[126:820] 

start_idx = -1
end_idx = -1

for i, line in enumerate(target_lines):
    if '<div className="max-w-md mx-auto px-4 mt-5">' in line and start_idx == -1:
        start_idx = i
    if '<SettingsDrawer ' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = target_lines[:start_idx] + chunk_to_insert + target_lines[end_idx:]
    
    content = "".join(new_lines)
    
    # Fix imports
    content = content.replace(
        'import { Wallet, LogOut, RefreshCw, Zap, Settings } from "lucide-react";',
        'import { Wallet, LogOut, RefreshCw, Zap, Settings, ArrowUpRight, Share2 } from "lucide-react";'
    )
    content = content.replace(
        'import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";',
        'import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, XAxis, CartesianGrid } from "recharts";'
    )
    
    # Insert DISTRIBUTION_DATA
    if 'const DISTRIBUTION_DATA =' not in content:
        content = content.replace(
            'const CHART_DATA = [',
            '''const DISTRIBUTION_DATA = [
  { name: "NBA", value: 420, color: "#FF6B00" },
  { name: "英超", value: 310, color: "#00F0FF" },
  { name: "欧冠", value: 180, color: "#ADFF2F" },
  { name: "其他", value: 90, color: "#8B5CF6" },
];\n\nconst CHART_DATA = ['''
        )
        
    # Fix activeTab state
    content = content.replace(
        'useState<"active" | "orders" | "history">("active");',
        'useState<"active" | "orders" | "history" | "transactions">("active");'
    )

    with open(target_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("PATCH SUCCESSFUL")
else:
    print(f"ERROR: Failed to find markers. start={start_idx}, end={end_idx}")
