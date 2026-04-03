import tkinter as tk
from tkinter import filedialog, messagebox
import os
import subprocess

# 설정 저장 파일 이름
CONFIG_FILE = "file_list_config.txt"

class CodeMergerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("코드 파일 병합기 (Gemini 업로드용)")
        self.root.geometry("600x500")

        # 파일 경로를 저장할 리스트
        self.file_list = []

        # UI 요소 생성
        self.label = tk.Label(root, text="병합할 코드 파일을 선택하세요.", font=("Arial", 12))
        self.label.pack(pady=10)

        # 파일 목록 표시창
        self.listbox = tk.Listbox(root, selectmode=tk.EXTENDED, width=70, height=12)
        self.listbox.pack(pady=10, padx=20)

        # 버튼 프레임
        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=5)

        self.btn_add = tk.Button(btn_frame, text="파일 추가 선택", command=self.add_files, width=15)
        self.btn_add.grid(row=0, column=0, padx=5)

        self.btn_clear = tk.Button(btn_frame, text="목록 초기화", command=self.clear_list, width=15)
        self.btn_clear.grid(row=0, column=1, padx=5)

        self.btn_save = tk.Button(root, text="병합 저장 및 탐색기에서 파일 선택", 
                                 command=self.save_and_select_file, bg="#4CAF50", fg="white", font=("Arial", 10, "bold"), height=2)
        self.btn_save.pack(pady=20)

        # 이전 목록 불러오기
        self.load_config()

    def add_files(self):
        files = filedialog.askopenfilenames(
            title="코드 파일 선택",
            filetypes=[("Code Files", "*.py *.js *.html *.css *.cpp *.java *.c *.txt *.ts *.tsx"), ("All Files", "*.*")]
        )
        
        if files:
            for f in files:
                if f not in self.file_list:
                    self.file_list.append(f)
                    self.listbox.insert(tk.END, f)
            self.save_config() # 목록 추가될 때마다 저장

    def clear_list(self):
        if messagebox.askyesno("확인", "목록을 모두 삭제하시겠습니까?"):
            self.file_list.clear()
            self.listbox.delete(0, tk.END)
            self.save_config()

    def load_config(self):
        """프로그램 시작 시 이전 파일 목록을 불러옴"""
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                paths = f.read().splitlines()
                for p in paths:
                    if os.path.exists(p): # 실제로 존재하는 파일만 추가
                        self.file_list.append(p)
                        self.listbox.insert(tk.END, p)

    def save_config(self):
        """현재 파일 목록을 설정 파일에 저장"""
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            for p in self.file_list:
                f.write(p + "\n")

    def save_and_select_file(self):
        if not self.file_list:
            messagebox.showwarning("경고", "선택된 파일이 없습니다.")
            return

        # 저장 파일명 (현재 스크립트와 같은 폴더에 저장)
        save_path = os.path.join(os.getcwd(), "merged_code_for_gemini.txt")

        try:
            with open(save_path, 'w', encoding='utf-8') as f:
                for file_path in self.file_list:
                    if not os.path.exists(file_path):
                        continue
                    
                    file_name = os.path.basename(file_path)
                    f.write(f"{'='*50}\n")
                    f.write(f"FILE PATH: {file_path}\n")
                    f.write(f"FILE NAME: {file_name}\n")
                    f.write(f"{'='*50}\n\n")

                    try:
                        with open(file_path, 'r', encoding='utf-8') as code_f:
                            content = code_f.read()
                            f.write(content)
                    except Exception as e:
                        f.write(f"[파일 읽기 오류: {str(e)}]")
                    
                    f.write("\n\n")

            # 저장 완료 후 탐색기 열기 및 파일 선택
            self.open_explorer_and_select(save_path)

        except Exception as e:
            messagebox.showerror("오류", f"저장 중 오류 발생: {e}")

    def open_explorer_and_select(self, path):
        """탐색기를 열고 해당 파일을 선택(강조) 상태로 만듦"""
        path = os.path.normpath(path)
        if os.name == 'nt': # Windows
            # /select, 옵션이 파일을 선택된 상태로 탐색기를 열어줍니다.
            subprocess.run(['explorer', '/select,', path])
        elif os.name == 'posix': # macOS
            subprocess.run(['open', '-R', path])

if __name__ == "__main__":
    root = tk.Tk()
    app = CodeMergerApp(root)
    root.mainloop()