import os
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox

def collect_files():
    # 1. GUI 루트 윈도우 생성 및 숨기기
    root = tk.Tk()
    root.withdraw()

    # 2. 작업할 폴더 선택 받기
    target_dir = filedialog.askdirectory(title="파일을 추출할 최상위 폴더를 선택하세요")
    
    if not target_dir:
        messagebox.showwarning("알림", "폴더가 선택되지 않았습니다.")
        return

    count = 0
    # 3. 하위 폴더 전체 순회 (os.walk 사용)
    for root_ptr, dirs, files in os.walk(target_dir):
        # 최상위 폴더 자체는 건너뜁니다 (이미 그곳에 있는 파일은 옮길 필요 없으므로)
        if root_ptr == target_dir:
            continue
            
        for file in files:
            source_path = os.path.join(root_ptr, file)
            destination_path = os.path.join(target_dir, file)

            # 파일명 중복 처리 (같은 이름의 파일이 이미 최상위에 있다면 이름 변경)
            if os.path.exists(destination_path):
                name, ext = os.path.splitext(file)
                destination_path = os.path.join(target_dir, f"{name}_복사본{ext}")

            try:
                # 파일 복사 (shutil.copy2는 메타데이터까지 보존합니다)
                shutil.copy2(source_path, destination_path)
                count += 1
            except Exception as e:
                print(f"에러 발생 ({file}): {e}")

    messagebox.showinfo("완료", f"총 {count}개의 파일을 최상위 폴더로 복사했습니다.")

if __name__ == "__main__":
    collect_files()