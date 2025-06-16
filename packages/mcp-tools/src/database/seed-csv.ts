import * as fs from 'fs'
import * as path from 'path'
import csv from 'csv-parser'

// Custom CSV parser options to handle duplicate column names
const csvOptions = {
  mapHeaders: ({ header, index }: { header: string; index: number }) => {
    // Handle duplicate WHSE_TI columns
    if (header === 'WHSE_TI' && index === 32) {
      return 'WHSE_TI_2'
    }
    return header
  }
}
import { prisma } from './client'

interface CSVRow {
  DIV_NBR: string
  DIV_NM_CD_NBR: string
  BRNCH_CD: string
  WAREHOUSE_LOCN: string
  DATE_EXTRACT: string
  TIME_EXTRACT: string
  AREA_ID: string
  AISLE: string
  BAY: string
  LEVEL_NUMBER: string
  ZONE: string
  PRODUCT_NUMBER: string
  LICENSE_PLATE: string
  PALLET_ID: string
  PALLET_STATUS: string
  PROD_DESC: string
  PURCHASE_PACK_SIZE: string
  PURCHASE_UOM: string
  QTY_AVAIL_UNITS: string
  QTY_AVAIL_EACHES: string
  INVY_STATUS: string
  SLOT_STATUS: string
  RACK_TYPE: string
  SLOT_TYPE: string
  FLOAT_CODE: string
  SLOT_CUBE: string
  AVAIL_CUBE_REMAINING: string
  SLOT_FACING: string
  SLOT_DEPTH: string
  SLOT_HEIGHT: string
  WHSE_TI: string
  WHSE_TI_2: string
  MFR_PROD_NBR: string
  BUYR_ID: string
  BUYR_NM: string
  DATE_RECEIVED: string
  EXPIRATION_DATE: string
  DAYS_REMAINING_AT_TIME_OF_RECEIVED: string
}

function parseCSVRow(row: CSVRow) {
  return {
    divNbr: row.DIV_NBR,
    divNmCdNbr: row.DIV_NM_CD_NBR,
    brnchCd: row.BRNCH_CD,
    warehouseLocn: row.WAREHOUSE_LOCN,
    dateExtract: row.DATE_EXTRACT,
    timeExtract: row.TIME_EXTRACT,
    areaId: row.AREA_ID,
    aisle: parseInt(row.AISLE) || 0,
    bay: parseInt(row.BAY) || 0,
    levelNumber: parseInt(row.LEVEL_NUMBER) || 0,
    zone: row.ZONE || null,
    productNumber: row.PRODUCT_NUMBER,
    licensePlate: row.LICENSE_PLATE,
    palletId: row.PALLET_ID,
    palletStatus: row.PALLET_STATUS,
    prodDesc: row.PROD_DESC || null,
    purchasePackSize: row.PURCHASE_PACK_SIZE || null,
    purchaseUom: row.PURCHASE_UOM || null,
    qtyAvailUnits: parseInt(row.QTY_AVAIL_UNITS) || 0,
    qtyAvailEaches: parseInt(row.QTY_AVAIL_EACHES) || 0,
    invyStatus: row.INVY_STATUS,
    slotStatus: row.SLOT_STATUS,
    rackType: row.RACK_TYPE,
    slotType: row.SLOT_TYPE,
    floatCode: row.FLOAT_CODE,
    slotCube: parseFloat(row.SLOT_CUBE) || 0,
    availCubeRemaining: parseFloat(row.AVAIL_CUBE_REMAINING) || 0,
    slotFacing: parseFloat(row.SLOT_FACING) || 0,
    slotDepth: parseFloat(row.SLOT_DEPTH) || 0,
    slotHeight: parseFloat(row.SLOT_HEIGHT) || 0,
    whseTi: row.WHSE_TI || null,
    mfrProdNbr: row.MFR_PROD_NBR || null,
    buyerId: row.BUYR_ID || null,
    buyrNm: row.BUYR_NM || null,
    dateReceived: row.DATE_RECEIVED || null,
    expirationDate: row.EXPIRATION_DATE || null,
    daysRemainingAtTimeOfReceived: parseInt(row.DAYS_REMAINING_AT_TIME_OF_RECEIVED) || null,
  }
}

export async function seedFromCSV(csvFilePath?: string) {
  const defaultPath = path.join(process.cwd(), '..', '..', 'USF_INVENTORY_ON_HAND_9B_2140_20250523_AM_EXTRACT.csv')
  const filePath = csvFilePath || defaultPath
  
  console.log(`🌱 Starting CSV seed from: ${filePath}`)
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`)
  }

  // Clear existing data
  console.log('🗑️ Clearing existing inventory data...')
  await prisma.inventoryLocation.deleteMany()
  
  const records: any[] = []
  let rowCount = 0
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv(csvOptions))
      .on('data', (row: CSVRow) => {
        try {
          const parsed = parseCSVRow(row)
          records.push(parsed)
          rowCount++
          
          if (rowCount % 1000 === 0) {
            console.log(`📊 Processed ${rowCount} rows...`)
          }
        } catch (error) {
          console.error(`❌ Error parsing row ${rowCount}:`, error)
        }
      })
      .on('end', async () => {
        try {
          console.log(`💾 Inserting ${records.length} records into database...`)
          
          // Insert in very small batches to avoid validation issues
          const batchSize = 10
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize)
            try {
              await prisma.inventoryLocation.createMany({
                data: batch,
                skipDuplicates: true
              })
              console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} (records ${i + 1}-${Math.min(i + batchSize, records.length)})`)
            } catch (batchError) {
              console.error(`❌ Error in batch ${Math.floor(i / batchSize) + 1} (records ${i + 1}-${Math.min(i + batchSize, records.length)}):`, batchError)
              
              // Try inserting records one by one to identify the problematic record
              console.log('🔍 Inserting records individually to identify issue...')
              for (let j = 0; j < batch.length; j++) {
                try {
                  await prisma.inventoryLocation.create({
                    data: batch[j]
                  })
                  console.log(`  ✅ Record ${i + j + 1} inserted successfully`)
                } catch (recordError) {
                  console.error(`  ❌ Error in record ${i + j + 1}:`, recordError)
                  console.error('  📋 Problematic record:', JSON.stringify(batch[j], null, 2))
                  throw recordError
                }
              }
            }
          }
          
          console.log(`🎉 Successfully seeded ${records.length} inventory records!`)
          
          // Verify the data
          const count = await prisma.inventoryLocation.count()
          console.log(`📋 Total records in database: ${count}`)
          
          resolve()
        } catch (error) {
          console.error('❌ Error inserting data:', error)
          reject(error)
        }
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error)
        reject(error)
      })
  })
}

// Run seeder if called directly
if (require.main === module) {
  seedFromCSV()
    .then(() => {
      console.log('✅ Seeding completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}