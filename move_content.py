import re

with open("/Users/dgsw50/Desktop/heakerton/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Extract the 4 cards from .stats-panel
# They are between <div class="metric-card"> (first one after panel-header-row) and the end of score-card-blue
start_marker = '<div class="metric-card">\n                                <h3 class="card-title">대기질 지수 (AQI)</h3>'
end_marker = '<!-- Right Panel -->'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find content to extract")
    exit(1)

extracted_content = html[start_idx:end_idx].strip()
# Remove the extracted content from the original position, but keep <!-- Right Panel -->
# Wait, actually let's just remove extracted_content.
html = html[:start_idx] + '                            ' + html[end_idx:]


# 2. Remove "기온 및 해수면 상승 예측" card from #rootmap-analysis-view
temp_start_marker = '<div class="metric-card analysis-card">\n                                <h3 class="card-title" style="margin-bottom: 16px;">기온 및 해수면 상승 예측</h3>'
temp_end_marker = '<div class="metric-card analysis-card">\n                                <h3 class="card-title" style="margin-bottom: 16px;">생물 다양성 회복 시뮬레이션</h3>'

t_start_idx = html.find(temp_start_marker)
t_end_idx = html.find(temp_end_marker)

if t_start_idx == -1 or t_end_idx == -1:
    print("Could not find temp card")
    exit(1)

html = html[:t_start_idx] + html[t_end_idx:]


# 3. Insert the extracted_content into #rootmap-analysis-view .analysis-grid
# We can insert it before the "생물 다양성 회복 시뮬레이션" card
insert_marker = '<div class="metric-card analysis-card">\n                                <h3 class="card-title" style="margin-bottom: 16px;">생물 다양성 회복 시뮬레이션</h3>'

insert_idx = html.find(insert_marker)
if insert_idx == -1:
    print("Could not find insert marker")
    exit(1)

html = html[:insert_idx] + extracted_content + '\n                            ' + html[insert_idx:]


with open("/Users/dgsw50/Desktop/heakerton/index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML modified successfully")
