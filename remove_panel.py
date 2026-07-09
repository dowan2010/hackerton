with open("/Users/dgsw50/Desktop/heakerton/index.html", "r", encoding="utf-8") as f:
    html = f.read()

start_marker = '                        <!-- Left Panel -->\n                        <div class="stats-panel">'
end_marker = '                        <!-- Right Panel -->'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find content to remove")
    exit(1)

html = html[:start_idx] + html[end_idx:]

with open("/Users/dgsw50/Desktop/heakerton/index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML modified successfully")
