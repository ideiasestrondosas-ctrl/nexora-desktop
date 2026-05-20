const fs = require('fs');
const path = require('path');

const translations = {
  pt: {
    queue_pipeline: {
      expandTooltip: 'Clique para ver ficheiros',
      noFilesForStatus: 'Sem ficheiros para este estado',
    },
    assetDetail_deleteFilesTitle: 'Eliminar ficheiros processados?',
    assetDetail_deleteFilesConfirm:
      'Deseja também eliminar os ficheiros processados do disco? Esta acção não pode ser desfeita.',
    factoryResetDeleteFilesTitle: 'Eliminar também ficheiros de output?',
    factoryResetDeleteFilesConfirm:
      'Eliminar todos os ficheiros de output processados do disco? (transcodificados, proxies, miniaturas). Escolha Não para manter os ficheiros.',
  },
  de: {
    queue_pipeline: {
      expandTooltip: 'Klicken, um Dateien anzuzeigen',
      noFilesForStatus: 'Keine Dateien für diesen Status',
    },
    assetDetail_deleteFilesTitle: 'Verarbeitete Dateien löschen?',
    assetDetail_deleteFilesConfirm:
      'Möchten Sie auch die verarbeiteten Dateien vom Datenträger löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    factoryResetDeleteFilesTitle: 'Auch Ausgabedateien löschen?',
    factoryResetDeleteFilesConfirm:
      'Alle verarbeiteten Ausgabedateien vom Datenträger löschen? (Transcodierungen, Proxys, Miniaturansichten). Wählen Sie Nein, um die Dateien zu behalten.',
  },
  es: {
    queue_pipeline: {
      expandTooltip: 'Haga clic para ver archivos',
      noFilesForStatus: 'Sin archivos para este estado',
    },
    assetDetail_deleteFilesTitle: '¿Eliminar archivos procesados?',
    assetDetail_deleteFilesConfirm:
      '¿Desea también eliminar los archivos procesados del disco? Esta acción no se puede deshacer.',
    factoryResetDeleteFilesTitle: '¿Eliminar también los archivos de salida?',
    factoryResetDeleteFilesConfirm:
      '¿Eliminar todos los archivos de salida procesados del disco? (transcodificados, proxies, miniaturas). Elija No para conservar los archivos.',
  },
  fr: {
    queue_pipeline: {
      expandTooltip: 'Cliquer pour voir les fichiers',
      noFilesForStatus: 'Aucun fichier pour ce statut',
    },
    assetDetail_deleteFilesTitle: 'Supprimer les fichiers traités ?',
    assetDetail_deleteFilesConfirm:
      'Voulez-vous également supprimer les fichiers traités du disque ? Cette action est irréversible.',
    factoryResetDeleteFilesTitle: 'Supprimer aussi les fichiers de sortie ?',
    factoryResetDeleteFilesConfirm:
      'Supprimer tous les fichiers de sortie traités du disque ? (transodés, proxys, miniatures). Choisissez Non pour conserver les fichiers.',
  },
  it: {
    queue_pipeline: {
      expandTooltip: 'Clicca per vedere i file',
      noFilesForStatus: 'Nessun file per questo stato',
    },
    assetDetail_deleteFilesTitle: 'Eliminare i file elaborati?',
    assetDetail_deleteFilesConfirm:
      'Vuoi anche eliminare i file elaborati dal disco? Questa azione non può essere annullata.',
    factoryResetDeleteFilesTitle: 'Eliminare anche i file di output?',
    factoryResetDeleteFilesConfirm:
      'Eliminare tutti i file di output elaborati dal disco? (transcodificati, proxy, miniature). Scegli No per mantenere i file.',
  },
  ja: {
    queue_pipeline: {
      expandTooltip: 'クリックしてファイルを表示',
      noFilesForStatus: 'このステータスのファイルはありません',
    },
    assetDetail_deleteFilesTitle: '処理済みファイルを削除しますか？',
    assetDetail_deleteFilesConfirm:
      '処理済みファイルをディスクからも削除しますか？この操作は元に戻せません。',
    factoryResetDeleteFilesTitle: '出力ファイルも削除しますか？',
    factoryResetDeleteFilesConfirm:
      '処理済みの出力ファイルをすべてディスクから削除しますか？（トランスコードファイル、プロキシ、サムネイル）。ファイルを保持するには「いいえ」を選択してください。',
  },
  ko: {
    queue_pipeline: {
      expandTooltip: '파일 보기 클릭',
      noFilesForStatus: '이 상태에 대한 파일 없음',
    },
    assetDetail_deleteFilesTitle: '처리된 파일을 삭제하시겠습니까?',
    assetDetail_deleteFilesConfirm:
      '처리된 파일을 디스크에서도 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    factoryResetDeleteFilesTitle: '출력 파일도 삭제하시겠습니까?',
    factoryResetDeleteFilesConfirm:
      '처리된 출력 파일을 모두 디스크에서 삭제하시겠습니까? (트랜스코딩 파일, 프록시, 썸네일). 파일을 유지하려면 아니오를 선택하세요.',
  },
  nl: {
    queue_pipeline: {
      expandTooltip: 'Klik om bestanden te zien',
      noFilesForStatus: 'Geen bestanden voor deze status',
    },
    assetDetail_deleteFilesTitle: 'Verwerkte bestanden verwijderen?',
    assetDetail_deleteFilesConfirm:
      'Wilt u ook de verwerkte bestanden van de schijf verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
    factoryResetDeleteFilesTitle: 'Uitvoerbestanden ook verwijderen?',
    factoryResetDeleteFilesConfirm:
      'Alle verwerkte uitvoerbestanden van de schijf verwijderen? (getranscodeerde bestanden, proxies, miniaturen). Kies Nee om de bestanden te behouden.',
  },
  pl: {
    queue_pipeline: {
      expandTooltip: 'Kliknij, aby zobaczyć pliki',
      noFilesForStatus: 'Brak plików dla tego statusu',
    },
    assetDetail_deleteFilesTitle: 'Usunąć przetworzone pliki?',
    assetDetail_deleteFilesConfirm:
      'Czy chcesz również usunąć przetworzone pliki z dysku? Tej akcji nie można cofnąć.',
    factoryResetDeleteFilesTitle: 'Usunąć też pliki wyjściowe?',
    factoryResetDeleteFilesConfirm:
      'Usunąć wszystkie przetworzone pliki wyjściowe z dysku? (pliki transkodowane, proxy, miniatury). Wybierz Nie, aby zachować pliki.',
  },
  ru: {
    queue_pipeline: {
      expandTooltip: 'Нажмите для просмотра файлов',
      noFilesForStatus: 'Нет файлов для этого статуса',
    },
    assetDetail_deleteFilesTitle: 'Удалить обработанные файлы?',
    assetDetail_deleteFilesConfirm:
      'Хотите также удалить обработанные файлы с диска? Это действие нельзя отменить.',
    factoryResetDeleteFilesTitle: 'Также удалить выходные файлы?',
    factoryResetDeleteFilesConfirm:
      'Удалить все обработанные выходные файлы с диска? (транскодированные файлы, прокси, миниатюры). Выберите «Нет», чтобы сохранить файлы.',
  },
  sv: {
    queue_pipeline: {
      expandTooltip: 'Klicka för att se filer',
      noFilesForStatus: 'Inga filer för denna status',
    },
    assetDetail_deleteFilesTitle: 'Ta bort bearbetade filer?',
    assetDetail_deleteFilesConfirm:
      'Vill du också ta bort de bearbetade filerna från disken? Den här åtgärden kan inte ångras.',
    factoryResetDeleteFilesTitle: 'Ta även bort utdatafiler?',
    factoryResetDeleteFilesConfirm:
      'Ta bort alla bearbetade utdatafiler från disken? (transkodade filer, proxies, miniatyrer). Välj Nej för att behålla filerna.',
  },
  tr: {
    queue_pipeline: {
      expandTooltip: 'Dosyaları görmek için tıklayın',
      noFilesForStatus: 'Bu durum için dosya yok',
    },
    assetDetail_deleteFilesTitle: 'İşlenmiş dosyalar silinsin mi?',
    assetDetail_deleteFilesConfirm:
      'İşlenmiş dosyaları diskten de silmek istiyor musunuz? Bu işlem geri alınamaz.',
    factoryResetDeleteFilesTitle: 'Çıktı dosyaları da silinsin mi?',
    factoryResetDeleteFilesConfirm:
      'Diskten işlenmiş tüm çıktı dosyaları silinsin mi? (dönüştürülmüş dosyalar, vekil sunucular, küçük resimler). Dosyaları korumak için Hayır seçin.',
  },
  ar: {
    queue_pipeline: {
      expandTooltip: 'انقر لرؤية الملفات',
      noFilesForStatus: 'لا توجد ملفات لهذه الحالة',
    },
    assetDetail_deleteFilesTitle: 'هل تريد حذف الملفات المعالجة؟',
    assetDetail_deleteFilesConfirm:
      'هل تريد أيضاً حذف الملفات المعالجة من القرص؟ لا يمكن التراجع عن هذا الإجراء.',
    factoryResetDeleteFilesTitle: 'هل تريد أيضاً حذف ملفات الإخراج؟',
    factoryResetDeleteFilesConfirm:
      'هل تريد حذف جميع ملفات الإخراج المعالجة من القرص؟ (الملفات المحولة، الوكلاء، الصور المصغرة). اختر لا للاحتفاظ بالملفات.',
  },
  zh: {
    queue_pipeline: { expandTooltip: '点击查看文件', noFilesForStatus: '此状态下无文件' },
    assetDetail_deleteFilesTitle: '删除已处理的文件？',
    assetDetail_deleteFilesConfirm: '是否同时从磁盘删除已处理的文件？此操作无法撤销。',
    factoryResetDeleteFilesTitle: '同时删除输出文件？',
    factoryResetDeleteFilesConfirm:
      '从磁盘删除所有已处理的输出文件？（转码文件、代理文件、缩略图）。选择“否”以保留文件。',
  },
};

const locales = Object.keys(translations);

for (const locale of locales) {
  const filePath = path.join(__dirname, '..', 'src', 'i18n', 'locales', locale, 'common.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const t = translations[locale];

  // Add queue.pipeline
  if (!data.queue.pipeline) {
    data.queue.pipeline = t.queue_pipeline;
  }

  // Add assetDetail keys
  if (!data.assetDetail.deleteFilesTitle) {
    data.assetDetail.deleteFilesTitle = t.assetDetail_deleteFilesTitle;
  }
  if (!data.assetDetail.deleteFilesConfirm) {
    data.assetDetail.deleteFilesConfirm = t.assetDetail_deleteFilesConfirm;
  }

  // Add settings.advanced keys
  if (!data.settings.advanced.factoryResetDeleteFilesTitle) {
    data.settings.advanced.factoryResetDeleteFilesTitle = t.factoryResetDeleteFilesTitle;
  }
  if (!data.settings.advanced.factoryResetDeleteFilesConfirm) {
    data.settings.advanced.factoryResetDeleteFilesConfirm = t.factoryResetDeleteFilesConfirm;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Updated:', locale);
}
console.log('All done.');
